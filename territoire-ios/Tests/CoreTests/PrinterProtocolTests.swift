import Foundation
import XCTest
@testable import PrinterProtocol

final class PrinterProtocolTests: XCTestCase {
    // Synthetic frame built from the documented byte offsets, not a device capture.
    private func frame(width: UInt8 = 12, error: UInt16 = 0, type: UInt8 = 0) -> Data {
        var b = [UInt8](repeating: 0, count: 32)
        b[0] = 0x80; b[1] = 0x20; b[2] = 0x42
        b[4] = 0x7f // Synthetic model; the app also verifies the EA device name/model before writing.
        b[8] = UInt8(error >> 8); b[9] = UInt8(error & 255)
        b[10] = width; b[11] = 1; b[18] = type
        return Data(b)
    }

    func testFramerHandlesSplitHeadersNoiseAndConsecutiveFrames() {
        let first = frame()
        let second = frame(width: 24, error: 0x0110, type: 2)
        let stream = Data([0, 255, 128, 0]) + first + second
        for chunkSize in 1...stream.count {
            var framer = StatusFramer()
            var statuses: [PrinterStatus] = []
            for start in stride(from: 0, to: stream.count, by: chunkSize) {
                statuses += framer.append(stream.subdata(in: start..<min(start + chunkSize, stream.count)))
            }
            XCTAssertEqual(statuses.map(\.raw), [first, second], "chunk size \(chunkSize)")
            XCTAssertEqual(framer.discardedBytes, 4)
        }
    }

    func testStatusDecodesBothErrorBytesAndRefusesUnsafeMedia() {
        let status = PrinterStatus(packet: frame(error: 0x0110))!
        XCTAssertEqual(status.errorDescriptions, ["pas de ruban", "capot ouvert"])
        XCTAssertFalse(status.ready)
        XCTAssertThrowsError(try PTouch.testJob(status: status))
        XCTAssertThrowsError(try PTouch.testJob(status: PrinterStatus(packet: frame(width: 36))!))
        var unsupported = Array(frame()); unsupported[11] = 3
        XCTAssertThrowsError(try PTouch.testJob(status: PrinterStatus(packet: Data(unsupported))!))
        XCTAssertNil(PrinterStatus(packet: frame().dropLast()))
    }

    func testRasterCentersTheBitmapAndPreservesBitOrientation() throws {
        let bitmap = PrinterBitmap(width: 2, height: 2, ink: [1, 0, 0, 1])
        let lines = try PTouch.rasterLines(bitmap)
        XCTAssertEqual(lines[0][7], 0x01) // top pixel -> head dot 63
        XCTAssertEqual(lines[1][8], 0x80) // bottom pixel -> head dot 64
        XCTAssertEqual(lines.flatMap { $0 }.filter { $0 != 0 }.count, 2)
        XCTAssertThrowsError(try PTouch.rasterLines(.init(width: 1, height: 129, ink: .init(repeating: 1, count: 129))))
    }

    func testCustomLabelMustFitTheActualTapeHeight() throws {
        let status = PrinterStatus(packet: frame())!
        let bitmap = PrinterBitmap(width: 3, height: 64, ink: .init(repeating: 1, count: 3 * 64))
        let job = Array(try PTouch.printJob(bitmap: bitmap, status: status))
        let info = PTouch.initialize.count
        XCTAssertEqual(Array(job[(info + 7)..<(info + 11)]), [3, 0, 0, 0])
        XCTAssertEqual(job.last, 0x1a)
        XCTAssertThrowsError(try PTouch.printJob(bitmap: bitmap, status: PrinterStatus(packet: frame(width: 6))!))
    }

    // Independent TIFF PackBits decoder, used to verify the complete printed payload.
    private func unpack(_ data: [UInt8]) throws -> [UInt8] {
        var decoded: [UInt8] = []
        var index = 0
        while index < data.count {
            let header = Int(Int8(bitPattern: data[index])); index += 1
            if header >= 0 {
                guard index + header + 1 <= data.count else { throw PrinterProtocolError.invalidBitmap }
                decoded += data[index..<(index + header + 1)]
                index += header + 1
            } else if header != -128 {
                guard index < data.count else { throw PrinterProtocolError.invalidBitmap }
                decoded += Array(repeating: data[index], count: 1 - header)
                index += 1
            }
        }
        return decoded
    }

    func testPackBitsBoundaryRunsAndLiteralSequences() throws {
        let inputs: [[UInt8]] = [
            [], [1], [1, 1], Array(repeating: 99, count: 128),
            Array(repeating: 99, count: 129), Array(0...255),
            Array(0...127) + [128, 128, 3, 4] + Array(repeating: 1, count: 256)
        ]
        for input in inputs { XCTAssertEqual(try unpack(PTouch.packBits(input)), input) }
    }

    func testJobDecodesToAllRasterColumnsOnEverySupportedTape() throws {
        for width: UInt8 in [4, 6, 9, 12, 18, 24] {
            let status = PrinterStatus(packet: frame(width: width))!
            let job = Array(try PTouch.testJob(status: status))
            let setup = Array(PTouch.initialize)
            XCTAssertEqual(Array(job.prefix(setup.count)), setup)
            let info = setup.count
            XCTAssertEqual(Array(job[info..<(info + 7)]), [0x1b, 0x69, 0x7a, 0xc4, 1, width, 0])
            XCTAssertEqual(Array(job[(info + 7)..<(info + 11)]), [0x1c, 0x01, 0, 0]) // 284 columns
            var index = info + 13 + 8 + 7 // Print information + mode/cut + margin/compression
            var decoded: [[UInt8]] = []
            while index < job.count - 1 {
                if job[index] == 0x5a {
                    decoded.append(.init(repeating: 0, count: 16)); index += 1
                } else {
                    XCTAssertEqual(job[index], 0x47)
                    let count = Int(job[index + 1]) | (Int(job[index + 2]) << 8)
                    index += 3
                    decoded.append(try unpack(Array(job[index..<(index + count)])))
                    index += count
                }
            }
            XCTAssertEqual(job.last, 0x1a)
            XCTAssertEqual(index, job.count - 1)
            XCTAssertEqual(decoded.count, 284)
            XCTAssertTrue(decoded.allSatisfy { $0.count == 16 })
            XCTAssertEqual(decoded, try PTouch.rasterLines(PTouch.testBitmap(height: status.printableHeight!)))
        }
    }
}
