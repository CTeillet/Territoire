import Foundation

/// Where a web view URL goes. Only the TMS origin is displayed as a page inside the app.
enum WebDestination: Equatable {
    /// Page of the TMS site.
    case tms
    /// Content made by a TMS page (blob, data, about:blank): shown or downloaded in place.
    case generated
    /// Label link for the printer screen.
    case printLink
    /// Other site or app (Safari, Plans, Waze, Téléphone, Mail…), handed over to iOS.
    case external
    /// Never opened (file, javascript, unknown apps, blobs of another site).
    case blocked
}

enum WebPolicy {
    private static let externalSchemes: Set<String> = ["http", "https", "tel", "mailto", "sms", "maps"]

    static func destination(of url: URL, base: URL) -> WebDestination {
        guard let scheme = url.scheme?.lowercased() else { return .blocked }
        switch scheme {
        case "tmsprint":
            return .printLink
        case "about", "data":
            return .generated
        case "blob":
            // blob:https://tms.example/<uuid> belongs to the page that created it
            guard let inner = URL(string: String(url.absoluteString.dropFirst("blob:".count))) else { return .blocked }
            return isSameOrigin(inner, base) ? .generated : .blocked
        default:
            if isSameOrigin(url, base) { return .tms }
            return externalSchemes.contains(scheme) ? .external : .blocked
        }
    }

    static func isSameOrigin(_ url: URL, _ base: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased(), ["http", "https"].contains(scheme),
              scheme == base.scheme?.lowercased(),
              let host = url.host?.lowercased(), host == base.host?.lowercased() else { return false }
        return effectivePort(url) == effectivePort(base)
    }

    private static func effectivePort(_ url: URL) -> Int? {
        url.port ?? (url.scheme?.lowercased() == "https" ? 443 : 80)
    }

    /// Last path component only: a page cannot choose where the file is written.
    static func downloadFileName(_ suggested: String) -> String {
        let name = suggested.split(whereSeparator: { "/\\:".contains($0) }).last.map(String.init) ?? ""
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines.union(.controlCharacters))
        return trimmed.isEmpty || trimmed.allSatisfy({ $0 == "." }) ? "fichier" : String(trimmed.prefix(120))
    }
}
