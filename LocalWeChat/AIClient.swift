import Foundation

final class AIClient: NSObject, URLSessionTaskDelegate {
    static let shared = AIClient()
    private lazy var session: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 120
        configuration.timeoutIntervalForResource = 120
        configuration.waitsForConnectivity = false
        return URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    }()

    func request(endpoint: String, apiKey: String, body: String, completion: @escaping (Int, String) -> Void) {
        guard let url = URL(string: endpoint), url.scheme?.lowercased() == "https" else {
            completion(-1, "AI 接口必须使用有效的 HTTPS 地址")
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = Data(body.utf8)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.httpShouldHandleCookies = false
        request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(-1, error.localizedDescription)
                return
            }
            guard let http = response as? HTTPURLResponse else {
                completion(-1, "接口未返回 HTTP 响应")
                return
            }
            guard let data = data, data.count <= 8 * 1024 * 1024 else {
                completion(-1, "接口响应为空或超过 8 MB")
                return
            }
            completion(http.statusCode, String(data: data, encoding: .utf8) ?? "接口响应不是 UTF-8 文本")
        }.resume()
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}
