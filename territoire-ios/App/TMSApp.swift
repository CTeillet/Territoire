import Combine
import SwiftUI

@main
struct TMSApp: App {
    @StateObject private var model = TMSAppModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            TMSRootView(web: model.web) { model.showsPrinter = true }
                .sheet(isPresented: $model.showsPrinter) { PrinterView(model: model.printer) }
                // From Safari or a home screen web app, as with TMS Impression.
                .onOpenURL { model.receivePrintLink($0) }
                .onChange(of: scenePhase) { phase in
                    if phase == .active { model.printer.resume() }
                    if phase == .background { model.printer.suspend() }
                }
                // TMS has no dark theme: keep the status bar and the printer screen in the same colours.
                .preferredColorScheme(.light)
        }
    }
}

/// Links the TMS page to the printer: label links, prints asked for by the page and the printer screen.
@MainActor
final class TMSAppModel: ObservableObject, TMSWebHost {
    let web: TMSWebModel
    let printer: PrinterController
    @Published var showsPrinter = false

    init() {
        web = TMSWebModel()
        printer = PrinterController()
        web.host = self
    }

    func receivePrintLink(_ url: URL) {
        printer.receivePrintRequest(url)
        showsPrinter = true
    }

    func handle(_ command: PrinterBridgeCommand) async -> [String: Any] {
        switch command {
        case .openSettings:
            showsPrinter = true
            return [:]
        case .print(let request):
            switch await printer.printFromPage(request) {
            case .printed:
                return ["printed": true]
            case .failed(let message):
                return ["printed": false, "message": message]
            }
        }
    }
}
