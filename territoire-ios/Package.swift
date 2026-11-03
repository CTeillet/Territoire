// swift-tools-version: 5.9
import PackageDescription

// The protocol tests require only Foundation, not an iPhone or the Brother SDK.
let package = Package(
    name: "PrinterProtocol",
    products: [.library(name: "PrinterProtocol", targets: ["PrinterProtocol"])],
    targets: [
        .target(name: "PrinterProtocol", path: "Core"),
        .testTarget(name: "PrinterProtocolTests", dependencies: ["PrinterProtocol"], path: "Tests/CoreTests")
    ]
)
