import Foundation

enum AppConfig {
    /// Production site — App Store builds always load this.
    static let productionURL = URL(string: "https://videograb.codedance.work")!

    /// Optional override for local/dev: set scheme env `VG_START_URL`
    /// e.g. `http://127.0.0.1:3000` (Simulator) or `http://<lan-ip>:3000` (device).
    static var startURL: URL {
        #if DEBUG
        if let raw = ProcessInfo.processInfo.environment["VG_START_URL"]?
            .trimmingCharacters(in: .whitespacesAndNewlines),
            !raw.isEmpty,
            let url = URL(string: raw)
        {
            return url
        }
        #endif
        return productionURL
    }

    static let appUserAgentSuffix = "VideoGrabiOS/1.0"
    static let urlScheme = "videograb"

    /// Hosts allowed inside the WKWebView (everything else → Safari / share).
    static let allowedHosts: Set<String> = [
        "videograb.codedance.work",
        "localhost",
        "127.0.0.1",
    ]

    static func isAllowedWebHost(_ host: String?) -> Bool {
        guard let host, !host.isEmpty else { return false }
        if allowedHosts.contains(host) { return true }
        #if DEBUG
        // Allow LAN IPs while developing against ./dev.sh
        if host.split(separator: ".").count == 4,
           host.split(separator: ".").allSatisfy({ UInt8($0) != nil })
        {
            return true
        }
        #endif
        return false
    }

    static func isExternalCheckout(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return host.contains("stripe.com")
            || host.contains("checkout.stripe.com")
            || host.contains("billing.stripe.com")
    }
}
