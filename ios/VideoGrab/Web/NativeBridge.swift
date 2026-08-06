import Foundation
import WebKit

enum BridgeMessage: String {
    case openExternal = "vgOpenExternal"
    case shareBlob = "vgShareBlob"
}

struct OpenExternalPayload: Decodable {
    let url: String
}

struct ShareBlobPayload: Decodable {
    let filename: String
    let mimeType: String?
    let base64: String
}

enum NativeBridge {
    static let handlerNames: [String] = [
        BridgeMessage.openExternal.rawValue,
        BridgeMessage.shareBlob.rawValue,
    ]

    /// Injected at document start so the web app can detect the shell before React hydrates.
    static var bootstrapScript: String {
        """
        (function () {
          if (window.VideoGrabNative) return;
          window.VideoGrabNative = {
            platform: 'ios',
            mode: 'ai-summary',
            version: '1.1.0',
            openExternal: function (url) {
              window.webkit.messageHandlers.vgOpenExternal.postMessage({ url: String(url) });
            },
            shareBlob: function (payload) {
              window.webkit.messageHandlers.vgShareBlob.postMessage(payload);
            }
          };
          document.documentElement.dataset.vgNative = 'ios';
          document.documentElement.dataset.vgMode = 'ai-summary';
        })();
        """
    }

    static func decode<T: Decodable>(_ type: T.Type, from body: Any) -> T? {
        guard let data = try? JSONSerialization.data(withJSONObject: body),
              let value = try? JSONDecoder().decode(T.self, from: data)
        else { return nil }
        return value
    }
}
