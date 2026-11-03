import Foundation

/// Port of territoire-front/lib/ptouch.ts. These commands use the P-touch raster
/// language; External Accessory provides the transport, not the printer protocol.
struct PrinterStatus: Equatable {
    let raw: Data
    let model: UInt8
    let errors: UInt16
    let tapeWidth: UInt8
    let mediaType: UInt8
    let tapeLength: UInt8
    let statusType: UInt8
    let phaseType: UInt8
    let phase: UInt16

    init?(packet: Data) {
        let b = Array(packet)
        guard b.count == 32, Array(b.prefix(3)) == [0x80, 0x20, 0x42] else { return nil }
        raw = packet
        model = b[4]
        errors = (UInt16(b[8]) << 8) | UInt16(b[9])
        tapeWidth = b[10]
        mediaType = b[11]
        tapeLength = b[17]
        statusType = b[18]
        phaseType = b[19]
        phase = (UInt16(b[20]) << 8) | UInt16(b[21])
    }

    var errorDescriptions: [String] {
        let bits: [(UInt16, String)] = [
            (0x0100, "pas de ruban"), (0x0200, "fin du ruban"),
            (0x0400, "coupe-ruban bloqué"), (0x0800, "batterie faible"),
            (0x1000, "imprimante occupée"), (0x2000, "imprimante éteinte"),
            (0x4000, "adaptateur inadapté"), (0x0001, "cassette incompatible"),
            (0x0002, "mémoire pleine"), (0x0004, "erreur de transmission"),
            (0x0008, "tampon plein"), (0x0010, "capot ouvert"),
            (0x0020, "surchauffe"), (0x0040, "défaut d'avance"),
            (0x0080, "erreur de l'imprimante")
        ]
        var result = bits.filter { errors & $0.0 != 0 }.map { $0.1 }
        if errors & 0x8000 != 0 { result.append("erreur inconnue 0x8000") }
        return result
    }

    var printableHeight: Int? {
        [4: 24, 6: 32, 9: 48, 12: 64, 18: 112, 24: 128][Int(tapeWidth)]
    }

    var ready: Bool {
        errors == 0 && phaseType == 0 && phase == 0 && statusType == 0
            && mediaType == 1 && printableHeight != nil
    }

    var summary: String {
        let problem = errorDescriptions.isEmpty ? "aucune erreur" : errorDescriptions.joined(separator: ", ")
        return "Modèle 0x\(String(format: "%02X", model)), ruban \(tapeWidth) mm, \(problem), type \(statusType), phase \(phaseType)/\(phase)"
    }
}

/// Reassembles 32-byte status messages, including split headers, noise and
/// several messages received together. No assumption about stream packet sizes.
struct StatusFramer {
    private(set) var discardedBytes = 0
    private var buffer: [UInt8] = []

    mutating func append(_ data: Data) -> [PrinterStatus] {
        var result: [PrinterStatus] = []
        for byte in data {
            buffer.append(byte)
            while buffer.count >= 3 && Array(buffer.prefix(3)) != [0x80, 0x20, 0x42] {
                buffer.removeFirst()
                discardedBytes += 1
            }
            if buffer.count == 32 {
                if let status = PrinterStatus(packet: Data(buffer)) { result.append(status) }
                buffer.removeAll(keepingCapacity: true)
            }
        }
        return result
    }
}

struct PrinterBitmap {
    let width: Int
    let height: Int
    var ink: [UInt8]
}

enum PrinterProtocolError: LocalizedError {
    case notReady
    case unsupportedMedia
    case invalidBitmap

    var errorDescription: String? {
        switch self {
        case .notReady: return "L'imprimante n'est pas prête. Relisez son état."
        case .unsupportedMedia: return "L'impression nécessite un ruban TZe reconnu, de 4 à 24 mm."
        case .invalidBitmap: return "Dimensions de l'étiquette incorrectes."
        }
    }
}

enum PTouch {
    // This request reads status only: no feed, cut or print instruction.
    static let statusRequest = Data([0x1b, 0x69, 0x53])
    static let initialize = Data(repeating: 0, count: 64) + Data([0x1b, 0x40, 0x1b, 0x69, 0x61, 0x01])

    static func packBits(_ bytes: [UInt8]) -> [UInt8] {
        var output: [UInt8] = []
        var i = 0
        while i < bytes.count {
            var run = 1
            while i + run < bytes.count && run < 128 && bytes[i + run] == bytes[i] { run += 1 }
            if run >= 2 {
                output += [UInt8(257 - run), bytes[i]]
                i += run
            } else {
                let start = i
                while i < bytes.count && i - start < 128
                    && !(i + 1 < bytes.count && bytes[i] == bytes[i + 1]) {
                    i += 1
                }
                output.append(UInt8(i - start - 1))
                output += bytes[start..<i]
            }
        }
        return output
    }

    static func rasterLines(_ bitmap: PrinterBitmap) throws -> [[UInt8]] {
        guard bitmap.width > 0, bitmap.width <= 3600, (1...128).contains(bitmap.height),
              bitmap.ink.count == bitmap.width * bitmap.height else {
            throw PrinterProtocolError.invalidBitmap
        }
        let offset = (128 - bitmap.height) / 2
        return (0..<bitmap.width).map { x in
            var line = [UInt8](repeating: 0, count: 16)
            for y in 0..<bitmap.height where bitmap.ink[y * bitmap.width + x] != 0 {
                let dot = offset + y
                line[dot / 8] |= UInt8(0x80 >> (dot % 8))
            }
            return line
        }
    }

    /// ~40 mm long, two lines of a fixed pixel font. No personal data, fonts,
    /// rendering APIs or external images are needed to validate actual printing.
    static func testBitmap(height: Int) -> PrinterBitmap {
        let width = 284
        let padding = 14
        let scale = max(1, min(height / 16, (width - 2 * padding) / 47))
        let glyphs: [Character: [UInt8]] = [
            "T": [31, 4, 4, 4, 4, 4, 4], "M": [17, 27, 21, 21, 17, 17, 17],
            "S": [15, 16, 16, 14, 1, 1, 30], "E": [31, 16, 16, 30, 16, 16, 31],
            "P": [30, 17, 17, 30, 16, 16, 16], "7": [31, 1, 2, 4, 8, 8, 8],
            "1": [4, 12, 4, 4, 4, 4, 14], "0": [14, 17, 19, 21, 25, 17, 14],
            "B": [30, 17, 17, 30, 17, 17, 30], " ": [0, 0, 0, 0, 0, 0, 0]
        ]
        var bitmap = PrinterBitmap(width: width, height: height, ink: .init(repeating: 0, count: width * height))
        for (lineIndex, text) in ["TMS TEST", "P710BT"].enumerated() {
            let textWidth = (text.count * 6 - 1) * scale
            let left = (width - textWidth) / 2
            let top = (height - 16 * scale) / 2 + lineIndex * 9 * scale
            for (letterIndex, character) in text.enumerated() {
                for (row, bits) in (glyphs[character] ?? glyphs[" "]!).enumerated() {
                    for column in 0..<5 where bits & (1 << (4 - column)) != 0 {
                        for dy in 0..<scale {
                            for dx in 0..<scale {
                                let x = left + (letterIndex * 6 + column) * scale + dx
                                let y = top + row * scale + dy
                                if x >= 0 && x < width && y >= 0 && y < height { bitmap.ink[y * width + x] = 1 }
                            }
                        }
                    }
                }
            }
        }
        return bitmap
    }

    static func testJob(status: PrinterStatus) throws -> Data {
        guard let height = status.printableHeight else { throw PrinterProtocolError.unsupportedMedia }
        return try printJob(bitmap: testBitmap(height: height), status: status)
    }

    static func printJob(bitmap: PrinterBitmap, status: PrinterStatus) throws -> Data {
        guard status.errors == 0, status.phaseType == 0, status.phase == 0, status.statusType == 0 else {
            throw PrinterProtocolError.notReady
        }
        guard status.mediaType == 1, let height = status.printableHeight else {
            throw PrinterProtocolError.unsupportedMedia
        }
        guard bitmap.height == height else { throw PrinterProtocolError.invalidBitmap }
        let lines = try rasterLines(bitmap)
        let count = UInt32(lines.count)
        var result = Array(initialize)
        result += [0x1b, 0x69, 0x7a, 0xc4, status.mediaType, status.tapeWidth, status.tapeLength]
        result += [UInt8(truncatingIfNeeded: count), UInt8(truncatingIfNeeded: count >> 8),
                   UInt8(truncatingIfNeeded: count >> 16), UInt8(truncatingIfNeeded: count >> 24), 0, 0]
        result += [0x1b, 0x69, 0x4b, 0x08, 0x1b, 0x69, 0x4d, 0x40] // Single label, automatic cut
        result += [0x1b, 0x69, 0x64, 0, 0, 0x4d, 0x02] // Margin 0, PackBits compression
        for line in lines {
            if line.allSatisfy({ $0 == 0 }) {
                result.append(0x5a)
            } else {
                let packed = packBits(line)
                result += [0x47, UInt8(packed.count & 255), UInt8(packed.count >> 8)]
                result += packed
            }
        }
        result.append(0x1a)
        return Data(result)
    }
}

extension Data {
    var hex: String { map { String(format: "%02X", $0) }.joined(separator: " ") }
}
