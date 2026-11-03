import SwiftUI

@main
struct TMSApp: App {
    @StateObject private var web = TMSWebModel()
    @StateObject private var printer = PrinterController()
    @State private var showsPrinter = false
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            TMSRootView(web: web) { showsPrinter = true }
                .sheet(isPresented: $showsPrinter) { PrinterView(model: printer) }
                // From a TMS page, or from Safari with the TMS Impression links.
                .onReceive(web.printLinks) { receivePrintLink($0) }
                .onOpenURL { receivePrintLink($0) }
                .onChange(of: scenePhase) { phase in
                    if phase == .active { printer.resume() }
                    if phase == .background { printer.suspend() }
                }
                // TMS has no dark theme: keep the status bar and the printer screen in the same colours.
                .preferredColorScheme(.light)
        }
    }

    private func receivePrintLink(_ url: URL) {
        printer.receivePrintRequest(url)
        showsPrinter = true
    }
}
