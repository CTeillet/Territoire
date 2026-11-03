import Foundation
import XCTest
@testable import PrinterProtocol

final class PrinterBridgeTests: XCTestCase {
    private let identifier = "24f49820-801c-4f63-bbd9-526cab9e6743"

    private func printMessage(name: Any = "Élodie D.", dueDate: Any = "2028-02-29") -> [String: Any] {
        ["action": "print", "id": identifier, "name": name, "dueDate": dueDate]
    }

    func testReadsAPrintRequestWithTheSameRulesAsALink() throws {
        let command = try PrinterBridgeCommand(body: printMessage(name: "Élodie & Jean + S."))
        let link = URL(string: "tmsprint://print?v=1&id=\(identifier)&name=%C3%89lodie%20%26%20Jean%20%2B%20S.&dueDate=2028-02-29")!
        let fromLink = try TMSPrintRequest(url: link)
        XCTAssertEqual(command, .print(fromLink))
        guard case .print(let request) = command else { return XCTFail("Commande inattendue") }
        XCTAssertEqual(request.dateLine, "À rendre le 29/02/2028")
    }

    func testOpensThePrinterScreen() throws {
        XCTAssertEqual(try PrinterBridgeCommand(body: ["action": "openSettings"]), .openSettings)
    }

    func testRefusesUnknownOrMalformedMessages() {
        let invalid: [Any] = [
            "print",
            ["action": "status"],
            ["action": "openSettings", "extra": true],
            ["id": identifier, "name": "Élodie D.", "dueDate": "2028-02-29"],
            printMessage().merging(["command": "raw"]) { $1 },
            printMessage(name: 42),
            printMessage(name: "Alice\nBob"),
            printMessage(name: String(repeating: "é", count: 129)),
            printMessage(dueDate: "2027-02-29"),
            printMessage().merging(["id": "bad-id"]) { $1 }
        ]
        for body in invalid {
            XCTAssertThrowsError(try PrinterBridgeCommand(body: body), "\(body)")
        }
    }
}
