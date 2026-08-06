import Foundation

enum DownloadManager {
    static func downloadJobFile(
        jobId: String,
        filename: String,
        token: String?,
        apiBase: String,
        completion: @escaping (Result<URL, Error>) -> Void
    ) {
        var base = apiBase.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if base.isEmpty {
            base = AppConfig.productionURL.absoluteString
        }
        guard let url = URL(string: "\(base)/api/jobs/\(jobId)/file") else {
            completion(.failure(DownloadError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.setValue("zh", forHTTPHeaderField: "Accept-Language")
        request.timeoutInterval = 600

        let task = URLSession.shared.downloadTask(with: request) { tempURL, response, error in
            if let error {
                completion(.failure(error))
                return
            }
            guard let tempURL else {
                completion(.failure(DownloadError.emptyResponse))
                return
            }
            if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
                completion(.failure(DownloadError.httpStatus(http.statusCode)))
                return
            }

            let safeName = sanitizedFilename(filename)
            let dest = FileManager.default.temporaryDirectory
                .appendingPathComponent(safeName, isDirectory: false)
            try? FileManager.default.removeItem(at: dest)
            do {
                try FileManager.default.moveItem(at: tempURL, to: dest)
                completion(.success(dest))
            } catch {
                completion(.failure(error))
            }
        }
        task.resume()
    }

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
        let base = trimmed.isEmpty ? "video.mp4" : trimmed
        let invalid = CharacterSet(charactersIn: "/:\\?%*|\"<>")
        return base.components(separatedBy: invalid).joined(separator: "_")
    }
}

enum DownloadError: LocalizedError {
    case invalidURL
    case emptyResponse
    case httpStatus(Int)
    case invalidBase64

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "无效的下载地址"
        case .emptyResponse: return "服务器未返回文件"
        case .httpStatus(let code): return "下载失败（HTTP \(code)）"
        case .invalidBase64: return "文件数据损坏"
        }
    }
}
