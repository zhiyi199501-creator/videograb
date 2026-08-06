import Foundation

enum DownloadManager {
    static func writeBase64File(
        filename: String,
        base64: String,
        completion: @escaping (Result<URL, Error>) -> Void
    ) {
        DispatchQueue.global(qos: .userInitiated).async {
            guard let data = Data(base64Encoded: base64, options: .ignoreUnknownCharacters) else {
                completion(.failure(DownloadError.invalidBase64))
                return
            }
            let dest = FileManager.default.temporaryDirectory
                .appendingPathComponent(sanitizedFilename(filename), isDirectory: false)
            do {
                try data.write(to: dest, options: .atomic)
                completion(.success(dest))
            } catch {
                completion(.failure(error))
            }
        }
    }

    private static func sanitizedFilename(_ name: String) -> String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let base = trimmed.isEmpty ? "export.bin" : trimmed
        let invalid = CharacterSet(charactersIn: "/:\\?%*|\"<>")
        return base.components(separatedBy: invalid).joined(separator: "_")
    }
}

enum DownloadError: LocalizedError {
    case invalidBase64

    var errorDescription: String? {
        switch self {
        case .invalidBase64: return "文件数据损坏"
        }
    }
}
