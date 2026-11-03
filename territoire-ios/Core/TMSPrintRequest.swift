import Foundation

/// A message from the TMS page carries label text only: no printer commands, credentials or remote URL.
struct TMSPrintRequest: Equatable {
    let id: UUID
    let name: String
    let dueDate: String

    var dateLine: String {
        let parts = dueDate.split(separator: "-")
        return "À rendre le \(parts[2])/\(parts[1])/\(parts[0])"
    }

    init(id: String, name: String, dueDate: String) throws {
        guard let uuid = UUID(uuidString: id), !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              name.unicodeScalars.count <= 128,
              name.rangeOfCharacter(from: .controlCharacters.union(.newlines)) == nil,
              Self.isValidDate(dueDate) else {
            throw TMSPrintRequestError.invalidLabel
        }
        self.id = uuid
        self.name = name
        self.dueDate = dueDate
    }

    private static func isValidDate(_ value: String) -> Bool {
        guard value.range(of: #"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"#, options: .regularExpression) != nil else { return false }
        let parts = value.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3, (1900...9999).contains(parts[0]) else { return false }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let components = DateComponents(year: parts[0], month: parts[1], day: parts[2])
        guard let date = calendar.date(from: components) else { return false }
        let actual = calendar.dateComponents([.year, .month, .day], from: date)
        return actual.year == parts[0] && actual.month == parts[1] && actual.day == parts[2]
    }
}

enum TMSPrintRequestError: LocalizedError {
    case invalidLabel
    var errorDescription: String? { "Nom ou date de l'étiquette invalide." }
}

/// Persist before sending a job. The same job must never be sent twice, even after a restart.
struct PrintRequestHistory {
    private(set) var ids: [String]
    init(ids: [String] = []) { self.ids = Array(ids.suffix(200)) }
    func contains(_ id: UUID) -> Bool { ids.contains(id.uuidString) }
    mutating func record(_ id: UUID) {
        guard !contains(id) else { return }
        ids.append(id.uuidString)
        ids = Array(ids.suffix(200))
    }
}
