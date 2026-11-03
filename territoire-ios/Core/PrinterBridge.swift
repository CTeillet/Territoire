import Foundation

/// Message from the TMS page shown in the app: window.webkit.messageHandlers.tmsPrinter.postMessage(…).
/// Like a link, it carries label text only, never printer commands.
enum PrinterBridgeCommand: Equatable {
    case print(TMSPrintRequest)
    case openSettings

    static let handlerName = "tmsPrinter"

    init(body: Any) throws {
        guard let body = body as? [String: Any], let action = body["action"] as? String else {
            throw PrinterBridgeError.invalidMessage
        }
        switch action {
        case "print" where Set(body.keys) == ["action", "id", "name", "dueDate"]:
            guard let id = body["id"] as? String, let name = body["name"] as? String,
                  let dueDate = body["dueDate"] as? String else { throw PrinterBridgeError.invalidMessage }
            let request = try TMSPrintRequest(id: id, name: name, dueDate: dueDate)
            self = .print(request)
        case "openSettings" where body.count == 1:
            self = .openSettings
        default:
            throw PrinterBridgeError.invalidMessage
        }
    }
}

enum PrinterBridgeError: LocalizedError {
    case invalidMessage
    var errorDescription: String? { "Demande non reconnue par cette version de l'app TMS." }
}
