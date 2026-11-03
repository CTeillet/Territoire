import Foundation
import XCTest
@testable import PrinterProtocol

final class WebPolicyTests: XCTestCase {
    private let base = URL(string: "https://tms.cteillet.fr")!

    private func destination(_ value: String) -> WebDestination {
        WebPolicy.destination(of: URL(string: value)!, base: base)
    }

    func testKeepsOnlyTheTMSOriginInsideTheApp() {
        XCTAssertEqual(destination("https://tms.cteillet.fr/territoires/12?vue=carte"), .tms)
        XCTAssertEqual(destination("https://TMS.cteillet.fr:443/login"), .tms)
        XCTAssertEqual(destination("https://tms.cteillet.fr.example.com/"), .external)
        XCTAssertEqual(destination("https://tms.cteillet.fr:8443/"), .external)
        XCTAssertEqual(destination("http://tms.cteillet.fr/"), .external)
    }

    func testHandsRoutesAndContactsOverToIOS() {
        XCTAssertEqual(destination("https://www.google.com/maps/dir/?api=1&destination=48.8,2.3"), .external)
        XCTAssertEqual(destination("https://maps.apple.com/?daddr=48.8,2.3"), .external)
        XCTAssertEqual(destination("https://waze.com/ul?ll=48.8,2.3&navigate=yes"), .external)
        XCTAssertEqual(destination("tel:+33123456789"), .external)
        XCTAssertEqual(destination("mailto:contact@example.com"), .external)
    }

    func testKeepsGeneratedContentAndPrintLinks() {
        XCTAssertEqual(destination("blob:https://tms.cteillet.fr/5f0c8f2e-8f47-4a39-9a43-2a3f6e1f0c1d"), .generated)
        XCTAssertEqual(destination("about:blank"), .generated)
        XCTAssertEqual(destination("data:text/plain,etiquette"), .generated)
        XCTAssertEqual(destination("tmsprint://print?v=1"), .printLink)
    }

    func testBlocksEverythingElse() {
        XCTAssertEqual(destination("blob:https://example.com/5f0c8f2e-8f47-4a39-9a43-2a3f6e1f0c1d"), .blocked)
        XCTAssertEqual(destination("javascript:alert(1)"), .blocked)
        XCTAssertEqual(destination("file:///etc/hosts"), .blocked)
        XCTAssertEqual(destination("autre-app://ouvrir"), .blocked)
    }

    func testDownloadNamesStayInTheirFolder() {
        XCTAssertEqual(WebPolicy.downloadFileName("Statistiques_Campagne_2026-11-03.xlsx"), "Statistiques_Campagne_2026-11-03.xlsx")
        XCTAssertEqual(WebPolicy.downloadFileName("../../etiquette.lbx"), "etiquette.lbx")
        XCTAssertEqual(WebPolicy.downloadFileName("a\\b:c.txt"), "c.txt")
        XCTAssertEqual(WebPolicy.downloadFileName(".."), "fichier")
        XCTAssertEqual(WebPolicy.downloadFileName("  "), "fichier")
    }
}
