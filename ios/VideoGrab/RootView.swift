import SwiftUI

struct RootView: View {
    @StateObject private var model = WebViewModel()

    var body: some View {
        ZStack {
            AppWebView(model: model)
                .ignoresSafeArea()

            if model.isLoading && model.progress < 0.95 {
                VStack(spacing: 16) {
                    ProgressView(value: model.progress)
                        .progressViewStyle(.linear)
                        .frame(width: 160)
                    Text("VideoGrab AI")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)
                }
                .padding(32)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
            }

            if let message = model.bannerMessage {
                VStack {
                    Text(message)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.black.opacity(0.78), in: Capsule())
                        .padding(.top, 56)
                    Spacer()
                }
                .transition(.move(edge: .top).combined(with: .opacity))
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                        withAnimation { model.bannerMessage = nil }
                    }
                }
            }
        }
        .sheet(item: $model.shareItem) { item in
            ShareSheet(items: [item.url])
        }
        .alert("导出失败", isPresented: Binding(
            get: { model.downloadError != nil },
            set: { if !$0 { model.downloadError = nil } }
        )) {
            Button("好", role: .cancel) { model.downloadError = nil }
        } message: {
            Text(model.downloadError ?? "")
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
