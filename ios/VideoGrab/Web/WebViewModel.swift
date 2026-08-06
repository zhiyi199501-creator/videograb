import Foundation
import Combine

struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}

@MainActor
final class WebViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var progress: Double = 0
    @Published var bannerMessage: String?
    @Published var downloadError: String?
    @Published var shareItem: ShareItem?
    @Published var reloadToken = UUID()

    let startURL = AppConfig.startURL

    func showBanner(_ text: String) {
        bannerMessage = text
    }

    func presentShare(fileURL: URL) {
        shareItem = ShareItem(url: fileURL)
    }

    func failDownload(_ message: String) {
        downloadError = message
    }
}
