import Foundation
import XCTest
@testable import PrinterProtocol

final class TMSPrintRequestTests: XCTestCase {
    private let identifier = "24f49820-801c-4f63-bbd9-526cab9e6743"

    private func request(id: String? = nil, name: String = "Élodie D.", date: String = "2028-02-29") throws -> TMSPrintRequest {
        try TMSPrintRequest(id: id ?? identifier, name: name, dueDate: date)
    }

    func testKeepsUnicodeAndTheCalendarDate() throws {
        let label = try request(name: "Élodie & Jean + S.")
        XCTAssertEqual(label.id, UUID(uuidString: identifier))
        XCTAssertEqual(label.name, "Élodie & Jean + S.")
        XCTAssertEqual(label.dateLine, "À rendre le 29/02/2028")
    }

    func testRefusesAmbiguousOrUnboundedLabels() {
        for text in ["", "  ", "\nAlice", "Alice\u{0000}", String(repeating: "é", count: 129)] {
            XCTAssertThrowsError(try request(name: text))
        }
        for date in ["2027-02-29", "2027-04-31", "2027-13-01", "2027-00-01", "2027-01-00", "2027-1-01", "2027-01-01T12:00:00Z", "1899-12-31"] {
            XCTAssertThrowsError(try request(date: date), date)
        }
        XCTAssertThrowsError(try request(id: "bad-id"))
        XCTAssertNoThrow(try request(name: String(repeating: "é", count: 128)))
    }

    func testHistorySurvivesRestartAndDoesNotRepeatAJob() {
        let id = UUID(uuidString: identifier)!
        var history = PrintRequestHistory()
        history.record(id)
        history.record(id)
        XCTAssertEqual(history.ids.count, 1)
        XCTAssertTrue(PrintRequestHistory(ids: history.ids).contains(id))
        for _ in 0..<210 { history.record(UUID()) }
        XCTAssertEqual(history.ids.count, 200)
    }
}
