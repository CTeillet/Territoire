import Foundation
import XCTest
@testable import PrinterProtocol

final class TMSPrintRequestTests: XCTestCase {
    private let identifier = "24f49820-801c-4f63-bbd9-526cab9e6743"

    private func link(name: String = "Élodie D.", date: String = "2028-02-29") -> URL {
        var components = URLComponents(string: "tmsprint://print")!
        components.queryItems = [URLQueryItem(name: "v", value: "1"), URLQueryItem(name: "id", value: identifier),
                                URLQueryItem(name: "name", value: name), URLQueryItem(name: "dueDate", value: date)]
        return components.url!
    }

    func testDecodesUnicodeAndPreservesCalendarDate() throws {
        let request = try TMSPrintRequest(url: link(name: "Élodie & Jean + S."))
        XCTAssertEqual(request.name, "Élodie & Jean + S.")
        XCTAssertEqual(request.dateLine, "À rendre le 29/02/2028")
        // Exact format emitted by JavaScript encodeURIComponent, including spaces and accents.
        let web = URL(string: "tmsprint://print?v=1&id=\(identifier)&name=%C3%89lodie%20%26%20Jean%20%2B%20S.&dueDate=2028-02-29")!
        XCTAssertEqual(try TMSPrintRequest(url: web), request)
    }

    func testRefusesAmbiguousOrUnboundedLinks() {
        for text in ["", "\nAlice", "Alice\u{0000}", String(repeating: "é", count: 129)] {
            XCTAssertThrowsError(try TMSPrintRequest(url: link(name: text)))
        }
        for date in ["2027-02-29", "2027-04-31", "2027-13-01", "2027-00-01", "2027-01-00", "2027-1-01", "2027-01-01T12:00:00Z"] {
            XCTAssertThrowsError(try TMSPrintRequest(url: link(date: date)), date)
        }
        let valid = link().absoluteString
        for invalid in [valid + "&name=Other", valid + "&command=print", valid + "#fragment",
                        valid.replacingOccurrences(of: "v=1", with: "v=2"),
                        valid.replacingOccurrences(of: "tmsprint:", with: "https:"),
                        valid.replacingOccurrences(of: "//print?", with: "//print/other?"),
                        valid.replacingOccurrences(of: "//print?", with: "//user@print?"),
                        valid.replacingOccurrences(of: identifier, with: "bad-id")] {
            XCTAssertThrowsError(try TMSPrintRequest(url: URL(string: invalid)!))
        }
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
