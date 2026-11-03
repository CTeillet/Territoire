import SwiftUI

@main
struct TMSPrinterDiagnosticApp: App {
    @StateObject private var model = PrinterController()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            DiagnosticView(model: model)
                .onOpenURL { model.receivePrintRequest($0) }
                .onChange(of: scenePhase) { phase in
                    if phase == .active { model.resume() }
                    if phase == .background { model.suspend() }
                }
        }
    }
}

private struct DiagnosticView: View {
    @ObservedObject var model: PrinterController
    @State private var confirmPrint = false
    @State private var confirmInitialize = false
    @AppStorage("autoPrintTMSLinks") private var autoPrintTMSLinks = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Imprimez les étiquettes reçues depuis TMS sur votre Brother PT-P710BT.")
                    Text("Appairez l'imprimante dans les réglages Bluetooth et fermez les autres apps Brother. Gardez cette app au premier plan jusqu'à la fin de l'impression.")
                        .font(.callout).foregroundStyle(.secondary)
                    #if targetEnvironment(simulator)
                    Text("Simulateur : l'accès Bluetooth MFi ne peut être testé que sur un véritable iPhone.")
                        .foregroundStyle(.orange)
                    #endif
                }
                Section("Étiquette TMS") {
                    if let request = model.pendingRequest {
                        Text(request.name).font(.title3.bold())
                        Text(request.dateLine)
                        Button("Imprimer cette étiquette") { model.printRequestedLabel() }
                            .disabled(!model.canPrintRequest)
                        Text("Après impression, revenez dans TMS avec le bouton de retour d'iOS ou le sélecteur d'apps.")
                            .font(.caption).foregroundStyle(.secondary)
                    } else {
                        Text("Depuis TMS sur cet iPhone, choisissez TMS Impression dans les paramètres d'étiquettes, puis touchez Imprimer après une attribution.")
                            .font(.callout)
                    }
                    Toggle("Imprimer automatiquement les demandes TMS", isOn: $autoPrintTMSLinks)
                        .disabled(model.isBusy)
                    Text("Une fois activé, l'ouverture d'un lien tmsprint lance une étiquette sans confirmation dans cette app. Sinon, vous pouvez vérifier le nom et la date avant d'imprimer.")
                        .font(.caption).foregroundStyle(.secondary)
                    if model.isBusy { ProgressView() }
                    Text(model.message).textSelection(.enabled)
                    if model.printOutcomeUnknown {
                        Text("Vérifiez la sortie de l'imprimante avant de redemander une étiquette dans TMS. Cette demande ne sera pas renvoyée automatiquement.")
                            .font(.callout).foregroundStyle(.orange)
                    }
                }
                Section("Progression") {
                    milestone("P710BT visible pour cette app", reached: model.accessories.contains { $0.isP710BT })
                    milestone("Session ouverte", reached: model.isConnected)
                    milestone("Réponse Brother reçue sur cette session", reached: model.communicationConfirmed)
                    milestone("Fin d'impression confirmée", reached: model.printConfirmed)
                }
                Section("Imprimante") {
                    HStack {
                        Button("Appairer…") { model.showBluetoothPicker() }
                        Spacer()
                        Button("Actualiser") { model.refreshAccessories() }
                    }.disabled(model.isBusy || model.isConnected)
                    Picker("Accessoire", selection: Binding(get: { model.selectedID }, set: { model.selectAccessory($0) })) {
                        Text("Aucun").tag(nil as Int?)
                        ForEach(model.accessories) { item in
                            Text(item.name).tag(Optional(item.id))
                        }
                    }.disabled(model.isBusy || model.isConnected)
                    if let item = model.selectedAccessory {
                        LabeledContent("Modèle", value: item.model.isEmpty ? "non communiqué" : item.model)
                        LabeledContent("Firmware", value: item.firmware.isEmpty ? "non communiqué" : item.firmware)
                        Text("Protocoles annoncés : \(item.protocols.isEmpty ? "aucun" : item.protocols.joined(separator: ", "))")
                            .font(.caption).textSelection(.enabled)
                        if !item.isP710BT {
                            Text("Ce test n'envoie des commandes qu'à une PT-P710BT identifiée par son nom ou son modèle.")
                                .font(.caption).foregroundStyle(.orange)
                        }
                    }
                    if model.availableProtocols.count > 1 {
                        Picker("Protocole", selection: $model.selectedProtocol) {
                            ForEach(model.availableProtocols, id: \.self) { Text($0).tag($0) }
                        }.disabled(model.isBusy || model.isConnected)
                    } else if let name = model.availableProtocols.first {
                        Text("Protocole utilisable : \(name)").font(.caption).textSelection(.enabled)
                    } else if model.selectedAccessory != nil {
                        Text("Aucun protocole commun visible. La connexion MFi n'est pas encore validée.")
                            .foregroundStyle(.orange)
                    }
                }
                Section("Connexion et état") {
                    Button("Ouvrir la connexion") { model.connect() }.disabled(!model.canConnect)
                    Button("Lire l'état — sans imprimer") { model.readStatus() }
                        .disabled(!model.isConnected || model.isBusy)
                    Button("Fermer la connexion", role: .destructive) { model.disconnect() }
                        .disabled(!model.hasSession && !model.isBusy)
                    if model.isBusy { ProgressView().frame(maxWidth: .infinity) }
                    Text(model.message).textSelection(.enabled)
                    if let status = model.lastStatus {
                        Text("Dernier état reçu : \(status.summary)").font(.caption).textSelection(.enabled)
                    }
                }
                Section("Étiquette de test") {
                    Text("Une étiquette d'environ 40 mm avec « TMS TEST / P710BT », adaptée à la largeur du ruban TZe détecté.")
                        .font(.caption)
                    Button("Imprimer une étiquette de test…") { confirmPrint = true }
                        .disabled(!model.isConnected || !model.communicationConfirmed || model.isBusy)
                    if model.printOutcomeUnknown {
                        Text("Une étiquette a peut-être déjà été imprimée. Vérifiez physiquement la sortie avant de réessayer.")
                            .font(.callout).foregroundStyle(.orange)
                    }
                }
                Section {
                    DisclosureGroup("Diagnostic avancé") {
                        Text("Protocoles déclarés dans cette app : \(model.declaredProtocols.joined(separator: ", "))")
                            .font(.caption).textSelection(.enabled)
                        Text("Le protocole Brother documenté est essayé par défaut. La P710BT peut nécessiter des conditions particulières : une liste vide ne suffit pas à conclure à une incompatibilité.")
                            .font(.caption)
                        Button("Lire avec initialisation raster…") { confirmInitialize = true }
                            .disabled(!model.isConnected || model.isBusy)
                        Text("À essayer si la session s'ouvre mais que la demande d'état seule ne reçoit rien. Cette commande vide le tampon de l'imprimante.")
                            .font(.caption).foregroundStyle(.secondary)
                        Text(model.logs.joined(separator: "\n"))
                            .font(.system(.caption2, design: .monospaced))
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    ShareLink(item: model.report) { Label("Partager le diagnostic", systemImage: "square.and.arrow.up") }
                } footer: {
                    Text("L'installation de l'app, l'ouverture d'une session MFi et une réponse réelle de l'imprimante sont trois vérifications distinctes.")
                }
            }
            .navigationTitle("TMS Impression")
            .confirmationDialog("Imprimer une étiquette de test ?", isPresented: $confirmPrint, titleVisibility: .visible) {
                Button("Imprimer une étiquette") { model.printTestLabel() }
                Button("Annuler", role: .cancel) {}
            } message: {
                Text("L'imprimante utilisera environ 40 mm de ruban, avec sa marge mécanique. Aucun nouvel essai n'est lancé automatiquement.")
            }
            .confirmationDialog("Initialiser le dialogue raster ?", isPresented: $confirmInitialize, titleVisibility: .visible) {
                Button("Initialiser puis lire l'état") { model.readStatus(initialize: true) }
                Button("Annuler", role: .cancel) {}
            } message: {
                Text("Le tampon d'impression sera vidé. Fermez les autres applications Brother et attendez la fin de tout travail en cours. Aucun ruban n'est imprimé par cette lecture.")
            }
        }
    }

    private func milestone(_ text: String, reached: Bool) -> some View {
        Label(text, systemImage: reached ? "checkmark.circle.fill" : "circle")
            .foregroundStyle(reached ? Color.green : Color.secondary)
            .font(.callout)
    }
}
