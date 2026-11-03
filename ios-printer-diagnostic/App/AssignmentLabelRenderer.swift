import UIKit

/// Same two-line layout as TMS, rendered locally with accented Unicode text.
@MainActor
enum AssignmentLabelRenderer {
    static func bitmap(for request: TMSPrintRequest, height: Int) throws -> PrinterBitmap {
        let gap = CGFloat(max(1, Int((Double(height) * 0.04).rounded())))
        let padding: CGFloat = 14 // 2 mm at 180 dpi
        let baseNameFont = UIFont.boldSystemFont(ofSize: 130)
        let baseDateFont = UIFont.systemFont(ofSize: 100)
        let scale = (CGFloat(height) - gap) / (baseNameFont.lineHeight + baseDateFont.lineHeight)
        let nameFont = UIFont.boldSystemFont(ofSize: 130 * scale)
        let dateFont = UIFont.systemFont(ofSize: 100 * scale)
        let nameAttributes: [NSAttributedString.Key: Any] = [.font: nameFont, .foregroundColor: UIColor.black]
        let dateAttributes: [NSAttributedString.Key: Any] = [.font: dateFont, .foregroundColor: UIColor.black]
        let nameSize = (request.name as NSString).size(withAttributes: nameAttributes)
        let dateSize = (request.dateLine as NSString).size(withAttributes: dateAttributes)
        let width = Int(ceil(max(nameSize.width, dateSize.width) + 2 * padding))
        guard width > 0, width <= 3600, (1...128).contains(height) else { throw PrinterProtocolError.invalidBitmap }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let image = UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format).image { context in
            UIColor.white.setFill()
            context.fill(CGRect(x: 0, y: 0, width: width, height: height))
            (request.name as NSString).draw(at: CGPoint(x: (CGFloat(width) - nameSize.width) / 2, y: 0), withAttributes: nameAttributes)
            (request.dateLine as NSString).draw(at: CGPoint(x: (CGFloat(width) - dateSize.width) / 2, y: nameFont.lineHeight + gap), withAttributes: dateAttributes)
        }
        guard let cgImage = image.cgImage else { throw PrinterProtocolError.invalidBitmap }
        var gray = [UInt8](repeating: 255, count: width * height)
        let rendered = gray.withUnsafeMutableBytes { bytes -> Bool in
            guard let context = CGContext(data: bytes.baseAddress, width: width, height: height,
                                          bitsPerComponent: 8, bytesPerRow: width,
                                          space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return false }
            context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
            return true
        }
        guard rendered else { throw PrinterProtocolError.invalidBitmap }
        return PrinterBitmap(width: width, height: height, ink: gray.map { $0 < 128 ? 1 : 0 })
    }
}
