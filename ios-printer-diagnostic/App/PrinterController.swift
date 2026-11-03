import Combine
import ExternalAccessory
import Foundation
import UIKit

private struct DiagnosticFailure: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

struct AccessoryInfo: Identifiable {
    let id: UInt
    let name: String
    let model: String
    let firmware: String
    let protocols: [String]

    var isP710BT: Bool {
        (name + " " + model).uppercased().replacingOccurrences(of: "-", with: "").contains("P710BT")
    }
}

@MainActor
final class PrinterController: NSObject, ObservableObject, StreamDelegate {
    @Published private(set) var accessories: [AccessoryInfo] = []
    @Published private(set) var selectedID: UInt?
    @Published var selectedProtocol = ""
    @Published private(set) var isConnected = false
    @Published private(set) var isBusy = false
    @Published private(set) var communicationConfirmed = false
    @Published private(set) var printConfirmed = false
    @Published private(set) var printOutcomeUnknown = false
    @Published private(set) var lastStatus: PrinterStatus?
    @Published private(set) var message = "Appairez la PT-P710BT dans les réglages Bluetooth, puis actualisez."
    @Published private(set) var logs: [String] = []

    // Only the protocol actually declared in the built/sideloaded app can be used.
    let declaredProtocols: [String]
    private var session: EASession?
    private var accessoryObjects: [UInt: EAAccessory] = [:]
    private var observers: [NSObjectProtocol] = []
    private var framer = StatusFramer()
    private var sequence = 0
    private var statuses: [(sequence: Int, status: PrinterStatus)] = []
    private var transportError: String?
    private var epoch = UUID()
    private var operationTask: Task<Void, Never>?
    private var operationID: UUID?
    private var printWriteStarted = false
    private var txBytes = 0
    private var rxBytes = 0

    var selectedAccessory: AccessoryInfo? { accessories.first { $0.id == selectedID } }
    var availableProtocols: [String] {
        selectedAccessory?.protocols.filter { declaredProtocols.contains($0) } ?? []
    }
    var canConnect: Bool {
        !isBusy && !isConnected && selectedAccessory?.isP710BT == true
            && availableProtocols.contains(selectedProtocol)
    }

    override init() {
        declaredProtocols = Bundle.main.object(forInfoDictionaryKey: "UISupportedExternalAccessoryProtocols") as? [String] ?? []
        super.init()
        let center = NotificationCenter.default
        for name in [Notification.Name.EAAccessoryDidConnect, Notification.Name.EAAccessoryDidDisconnect] {
            observers.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] notification in
                let eventName = notification.name.rawValue
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    self.log("Notification : \(eventName)")
                    if let activeID = self.session?.accessory.connectionID,
                       !EAAccessoryManager.shared().connectedAccessories.contains(where: { $0.connectionID == activeID }) {
                        self.disconnect(reason: "L'accessoire a été déconnecté par iOS.")
                    }
                    self.refreshAccessories()
                }
            })
        }
        EAAccessoryManager.shared().registerForLocalNotifications()
        log("App \(version), iOS \(UIDevice.current.systemVersion)")
        log("Protocoles déclarés : \(declaredProtocols.joined(separator: ", "))")
        refreshAccessories()
    }

    deinit {
        for observer in observers { NotificationCenter.default.removeObserver(observer) }
    }

    func refreshAccessories() {
        let connected = EAAccessoryManager.shared().connectedAccessories
        accessoryObjects = Dictionary(uniqueKeysWithValues: connected.map { ($0.connectionID, $0) })
        accessories = connected.map {
            AccessoryInfo(id: $0.connectionID, name: $0.name, model: $0.modelNumber,
                          firmware: $0.firmwareRevision, protocols: $0.protocolStrings)
        }
        if !accessories.contains(where: { $0.id == selectedID }) {
            selectedID = accessories.first(where: \.isP710BT)?.id ?? accessories.first?.id
        }
        updateProtocol()
        log("\(accessories.count) accessoire(s) visible(s) pour cette app.")
        for item in accessories {
            log("\(item.name), modèle \(item.model), firmware \(item.firmware), protocoles : \(item.protocols.joined(separator: ", "))")
        }
        if accessories.isEmpty && !isBusy {
            message = "Aucun accessoire visible pour cette app. Vérifiez l'appairage et fermez les apps Brother. Un protocole ou une autorisation MFi manquante reste aussi possible."
        }
    }

    func selectAccessory(_ id: UInt?) {
        guard !isBusy && !isConnected else { return }
        selectedID = id
        updateProtocol()
    }

    private func updateProtocol() {
        if !availableProtocols.contains(selectedProtocol) { selectedProtocol = availableProtocols.first ?? "" }
    }

    func showBluetoothPicker() {
        guard !isBusy && !isConnected else { return }
        log("Ouverture du sélecteur Bluetooth Apple.")
        EAAccessoryManager.shared().showBluetoothAccessoryPicker(
            withNameFilter: NSPredicate(format: "SELF CONTAINS[c] %@", "P710BT")
        ) { [weak self] error in
            let detail = error.map { "\(($0 as NSError).domain)/\(($0 as NSError).code) : \($0.localizedDescription)" }
            Task { @MainActor [weak self] in
                guard let self else { return }
                if let detail { self.log("Sélecteur : \(detail)") }
                self.refreshAccessories()
            }
        }
    }

    func connect() {
        run("Ouverture de la connexion…") { [self] in
            guard let id = selectedID, let accessory = accessoryObjects[id],
                  selectedAccessory?.isP710BT == true else {
                throw DiagnosticFailure(message: "Sélectionnez une PT-P710BT identifiée par son nom ou son modèle.")
            }
            let protocolName = selectedProtocol
            guard declaredProtocols.contains(protocolName), accessory.protocolStrings.contains(protocolName) else {
                throw DiagnosticFailure(message: "Aucun protocole commun entre l'accessoire et cette app. Cela ne prouve pas une incompatibilité matérielle.")
            }
            closeTransport()
            guard let opened = EASession(accessory: accessory, forProtocol: protocolName),
                  let input = opened.inputStream, let output = opened.outputStream else {
                throw DiagnosticFailure(message: "iOS refuse l'ouverture de la session MFi. Vérifiez le protocole, les autres apps et les conditions d'accès Brother.")
            }
            session = opened
            let expectedEpoch = epoch
            for stream in [input as Stream, output as Stream] {
                stream.delegate = self
                stream.schedule(in: .main, forMode: .common)
                stream.open()
            }
            let deadline = ProcessInfo.processInfo.systemUptime + 8
            while !streamIsOpen(input) || !streamIsOpen(output) {
                try checkTransport(expectedEpoch)
                guard ProcessInfo.processInfo.systemUptime < deadline else {
                    throw DiagnosticFailure(message: "La session existe, mais les flux ne se sont pas ouverts en 8 secondes.")
                }
                try await Task.sleep(nanoseconds: 20_000_000)
            }
            isConnected = true
            message = "Session ouverte. Touchez « Lire l'état » pour vérifier une réponse réelle de l'imprimante."
            log("Session et deux flux ouverts avec \(protocolName). Aucune réponse imprimante encore requise.")
        }
    }

    func readStatus(initialize: Bool = false) {
        run(initialize ? "Initialisation du dialogue raster…" : "Demande d'état…") { [self] in
            let expectedEpoch = epoch
            try requireTarget()
            if initialize {
                log("Initialisation demandée explicitement : remise à zéro du tampon, aucun ordre d'impression.")
                try await send(PTouch.initialize, epoch: expectedEpoch)
            }
            let status = try await fetchStatus(epoch: expectedEpoch)
            message = status.errors == 0 ? "Réponse Brother reçue. La communication fonctionne pour cette session." : "Réponse reçue : \(status.errorDescriptions.joined(separator: ", "))."
        }
    }

    func printTestLabel() {
        run("Vérification avant impression…") { [self] in
            let expectedEpoch = epoch
            try requireTarget()
            let status = try await fetchStatus(epoch: expectedEpoch)
            guard status.model != 0x72 else {
                throw DiagnosticFailure(message: "L'appareil répond comme une PT-P300BT. Ce test est réservé à la PT-P710BT.")
            }
            let job = try PTouch.testJob(status: status)
            readAvailableBytes()
            let watermark = sequence
            printConfirmed = false
            printOutcomeUnknown = false
            printWriteStarted = true
            message = "Envoi d'une étiquette TMS TEST (environ 40 mm)…"
            try await send(job, epoch: expectedEpoch)
            message = "Données envoyées. Attente de la confirmation d'impression…"
            let deadline = ProcessInfo.processInfo.systemUptime + 30
            var seen = watermark
            while ProcessInfo.processInfo.systemUptime < deadline {
                try checkTransport(expectedEpoch)
                for event in statuses where event.sequence > seen {
                    seen = event.sequence
                    let reply = event.status
                    if reply.errors != 0 || reply.statusType == 2 || reply.statusType == 4 {
                        throw DiagnosticFailure(message: "L'imprimante signale une erreur après l'envoi : \(reply.summary). Vérifiez physiquement la sortie.")
                    }
                    if reply.statusType == 1 {
                        printConfirmed = true
                        printWriteStarted = false
                        message = "Fin d'impression confirmée par l'imprimante. Vérifiez aussi l'étiquette produite."
                        log("PRINTING_COMPLETED reçu pour cet essai.")
                        return
                    }
                }
                try await Task.sleep(nanoseconds: 20_000_000)
            }
            throw DiagnosticFailure(message: "Aucune confirmation de fin en 30 secondes. Une étiquette a peut-être été imprimée : vérifiez avant un nouvel essai.")
        }
    }

    func disconnect(reason: String = "Connexion fermée.") {
        operationTask?.cancel()
        operationTask = nil
        operationID = nil
        isBusy = false
        if printWriteStarted {
            printOutcomeUnknown = true
            printWriteStarted = false
        }
        closeTransport()
        message = reason
        log(reason)
    }

    func suspend() {
        if session != nil || isBusy {
            disconnect(reason: "App en arrière-plan : connexion fermée. Rouvrez la session au retour.")
        }
    }

    private func run(_ label: String, operation: @escaping @MainActor () async throws -> Void) {
        guard !isBusy else { return }
        isBusy = true
        message = label
        let id = UUID()
        operationID = id
        operationTask = Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                try await operation()
            } catch {
                guard operationID == id else { return }
                if printWriteStarted {
                    printOutcomeUnknown = true
                    printWriteStarted = false
                }
                message = error.localizedDescription
                log("Échec : \(error.localizedDescription)")
                // A failed/partial write leaves an uncertain stream. Reconnect explicitly.
                closeTransport()
            }
            if operationID == id {
                isBusy = false
                operationID = nil
                operationTask = nil
            }
        }
    }

    private func requireTarget() throws {
        guard isConnected, selectedAccessory?.isP710BT == true else {
            throw DiagnosticFailure(message: "Ouvrez d'abord une session avec la PT-P710BT.")
        }
    }

    private func checkTransport(_ expectedEpoch: UUID) throws {
        try Task.checkCancellation()
        guard epoch == expectedEpoch, session != nil else {
            throw DiagnosticFailure(message: "La connexion a été fermée.")
        }
        if let transportError { throw DiagnosticFailure(message: transportError) }
    }

    private func streamIsOpen(_ stream: Stream) -> Bool {
        [.open, .reading, .writing].contains(stream.streamStatus)
    }

    private func closeTransport() {
        epoch = UUID()
        if let session {
            for stream in [session.inputStream as Stream?, session.outputStream as Stream?].compactMap({ $0 }) {
                stream.delegate = nil
                stream.close()
                stream.remove(from: .main, forMode: .common)
            }
        }
        session = nil
        isConnected = false
        communicationConfirmed = false
        transportError = nil
        framer = StatusFramer()
        statuses.removeAll()
    }

    private func fetchStatus(epoch expectedEpoch: UUID) async throws -> PrinterStatus {
        for attempt in 1...3 {
            try checkTransport(expectedEpoch)
            readAvailableBytes() // Drain old frames before the request's receive watermark.
            let watermark = sequence
            log("Demande d'état \(attempt)/3.")
            try await send(PTouch.statusRequest, epoch: expectedEpoch)
            let deadline = ProcessInfo.processInfo.systemUptime + 2
            while ProcessInfo.processInfo.systemUptime < deadline {
                try checkTransport(expectedEpoch)
                if let event = statuses.first(where: {
                    $0.sequence > watermark && ($0.status.statusType == 0 || $0.status.statusType == 2)
                }) { return event.status }
                try await Task.sleep(nanoseconds: 20_000_000)
            }
        }
        throw DiagnosticFailure(message: "Les flux sont ouverts, mais aucune réponse d'état Brother n'a été reçue. Essayez une reconnexion puis, si nécessaire, la lecture avec initialisation raster.")
    }

    private func send(_ data: Data, epoch expectedEpoch: UUID) async throws {
        let bytes = Array(data)
        var offset = 0
        let deadline = ProcessInfo.processInfo.systemUptime + 10
        while offset < bytes.count {
            try checkTransport(expectedEpoch)
            guard let output = session?.outputStream else {
                throw DiagnosticFailure(message: "Flux de sortie indisponible.")
            }
            guard ProcessInfo.processInfo.systemUptime < deadline else {
                throw DiagnosticFailure(message: "Délai d'écriture dépassé après \(offset)/\(bytes.count) octets.")
            }
            if output.hasSpaceAvailable {
                let count = bytes.withUnsafeBufferPointer {
                    output.write($0.baseAddress!.advanced(by: offset), maxLength: min(512, bytes.count - offset))
                }
                if count < 0 {
                    throw DiagnosticFailure(message: output.streamError?.localizedDescription ?? "Échec d'écriture du flux.")
                }
                offset += count
                txBytes += count
                if count > 0 { continue }
            }
            try await Task.sleep(nanoseconds: 20_000_000)
        }
        log("TX \(data.count) octets : \(data.prefix(24).hex)\(data.count > 24 ? " …" : "")")
    }

    nonisolated func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
        Task { @MainActor [weak self] in
            guard let self, let session,
                  aStream === session.inputStream || aStream === session.outputStream else { return }
            handleStream(aStream, event: eventCode)
        }
    }

    private func handleStream(_ stream: Stream, event: Stream.Event) {
        if event.contains(.openCompleted) { log("Flux \(stream === session?.inputStream ? "entrant" : "sortant") ouvert.") }
        if event.contains(.hasBytesAvailable) { readAvailableBytes() }
        if event.contains(.errorOccurred) || event.contains(.endEncountered) {
            transportError = stream.streamError?.localizedDescription ?? "Le flux Bluetooth a été fermé par iOS ou l'imprimante."
            isConnected = false
            log("Flux : \(transportError!)")
            if !isBusy { message = transportError! }
        }
    }

    private func readAvailableBytes() {
        guard let input = session?.inputStream else { return }
        var bytes = [UInt8](repeating: 0, count: 1024)
        // Limit each event handler; a device sending continuously must not block the UI.
        for _ in 0..<32 where input.hasBytesAvailable {
            let count = input.read(&bytes, maxLength: bytes.count)
            if count < 0 {
                transportError = input.streamError?.localizedDescription ?? "Échec de lecture."
                return
            }
            if count == 0 { return }
            let data = Data(bytes.prefix(count))
            rxBytes += count
            log("RX \(count) octets : \(data.prefix(96).hex)\(count > 96 ? " …" : "")")
            let previousDiscarded = framer.discardedBytes
            for status in framer.append(data) {
                sequence += 1
                statuses.append((sequence, status))
                if statuses.count > 200 { statuses.removeFirst(statuses.count - 200) }
                lastStatus = status
                communicationConfirmed = true
                log("État #\(sequence) : \(status.summary)")
            }
            if framer.discardedBytes > previousDiscarded {
                log("\(framer.discardedBytes - previousDiscarded) octet(s) hors trame d'état.")
            }
        }
    }

    private func log(_ value: String) {
        logs.append("[\(Date().formatted(date: .omitted, time: .standard))] \(value)")
        if logs.count > 400 { logs.removeFirst(logs.count - 400) }
    }

    private var version: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        let commit = Bundle.main.object(forInfoDictionaryKey: "TMSDiagnosticCommit") as? String ?? "local"
        return "\(version) / \(commit)"
    }

    var report: String {
        """
        TMS — Diagnostic PT-P710BT
        Version : \(version)
        iOS : \(UIDevice.current.systemVersion)
        Date : \(Date().ISO8601Format())
        Protocoles déclarés : \(declaredProtocols.joined(separator: ", "))
        Dernier résultat : \(message)
        Octets TX/RX : \(txBytes)/\(rxBytes)
        Dernier état : \(lastStatus?.raw.hex ?? "aucun")
        Impression confirmée : \(printConfirmed)
        Résultat impression incertain : \(printOutcomeUnknown)

        \(logs.joined(separator: "\n"))
        """
    }
}
