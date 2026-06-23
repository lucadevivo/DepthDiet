import ExpoModulesCore
import ARKit
import SceneKit
import CoreImage
import UIKit

// MARK: - Expo module

public class LidarMealModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LidarMeal")

    // Vero solo sui device con LiDAR (Pro/Pro Max): ARKit espone la scene depth.
    Function("isSupported") { () -> Bool in
      ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
    }

    // Presenta lo schermo AR a inquadratura singola e risolve con foto + volume.
    AsyncFunction("captureMeal") { (promise: Promise) in
      DispatchQueue.main.async {
        guard ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) else {
          promise.reject("UNSUPPORTED", "Questo dispositivo non ha il sensore LiDAR")
          return
        }
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("NO_VC", "Nessun controller disponibile per la cattura")
          return
        }
        var settled = false
        let vc = LidarCaptureViewController()
        vc.onResult = { result in
          if settled { return }
          settled = true
          switch result {
          case .cancelled:
            promise.reject("CANCELLED", "Cattura annullata")
          case .failure(let message):
            promise.reject("CAPTURE_FAILED", message)
          case .success(let payload):
            promise.resolve(payload)
          }
        }
        vc.modalPresentationStyle = .fullScreen
        presenter.present(vc, animated: true)
      }
    }
  }
}

// MARK: - Risultato della cattura

enum LidarCaptureResult {
  case success([String: Any])
  case cancelled
  case failure(String)
}

enum MealQuality: String {
  case high, medium, low, none
}

struct MealMeasurement {
  let volumeMl: Double
  let quality: MealQuality
}

// MARK: - View controller AR

final class LidarCaptureViewController: UIViewController, ARSessionDelegate {
  var onResult: ((LidarCaptureResult) -> Void)?

  private let sceneView = ARSCNView()
  private let instruction = UILabel()
  private let measureButton = UIButton(type: .system)
  private let cancelButton = UIButton(type: .system)
  private let crosshair = UIView()
  private var didFinish = false

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black
    setupSceneView()
    setupOverlay()
  }

  private func setupSceneView() {
    sceneView.translatesAutoresizingMaskIntoConstraints = false
    sceneView.session.delegate = self
    sceneView.automaticallyUpdatesLighting = true
    view.addSubview(sceneView)
    NSLayoutConstraint.activate([
      sceneView.topAnchor.constraint(equalTo: view.topAnchor),
      sceneView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      sceneView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      sceneView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
    ])
  }

  private func setupOverlay() {
    // Mirino centrale
    crosshair.translatesAutoresizingMaskIntoConstraints = false
    crosshair.layer.borderColor = UIColor.white.withAlphaComponent(0.8).cgColor
    crosshair.layer.borderWidth = 2
    crosshair.layer.cornerRadius = 12
    crosshair.backgroundColor = .clear
    view.addSubview(crosshair)

    instruction.translatesAutoresizingMaskIntoConstraints = false
    instruction.text = "Inquadra il piatto dall'alto, poi tocca Scatta"
    instruction.textColor = .white
    instruction.font = .systemFont(ofSize: 16, weight: .semibold)
    instruction.numberOfLines = 0
    instruction.textAlignment = .center
    instruction.layer.shadowColor = UIColor.black.cgColor
    instruction.layer.shadowOpacity = 0.8
    instruction.layer.shadowRadius = 3
    instruction.layer.shadowOffset = .zero
    view.addSubview(instruction)

    configureButton(measureButton, title: "Scatta", bg: UIColor.systemGreen)
    measureButton.addTarget(self, action: #selector(onMeasure), for: .touchUpInside)
    view.addSubview(measureButton)

    configureButton(cancelButton, title: "Annulla", bg: UIColor(white: 0.2, alpha: 0.9))
    cancelButton.addTarget(self, action: #selector(onCancel), for: .touchUpInside)
    view.addSubview(cancelButton)

    NSLayoutConstraint.activate([
      crosshair.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      crosshair.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      crosshair.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.7),
      crosshair.heightAnchor.constraint(equalTo: crosshair.widthAnchor),

      instruction.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
      instruction.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
      instruction.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 24),

      measureButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      measureButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -28),
      measureButton.widthAnchor.constraint(equalToConstant: 200),
      measureButton.heightAnchor.constraint(equalToConstant: 54),

      cancelButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      cancelButton.bottomAnchor.constraint(equalTo: measureButton.topAnchor, constant: -12),
      cancelButton.widthAnchor.constraint(equalToConstant: 200),
      cancelButton.heightAnchor.constraint(equalToConstant: 44),
    ])
  }

  private func configureButton(_ button: UIButton, title: String, bg: UIColor) {
    button.translatesAutoresizingMaskIntoConstraints = false
    button.setTitle(title, for: .normal)
    button.setTitleColor(.white, for: .normal)
    button.titleLabel?.font = .systemFont(ofSize: 18, weight: .bold)
    button.backgroundColor = bg
    button.layer.cornerRadius = 14
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    let config = ARWorldTrackingConfiguration()
    if ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth) {
      config.frameSemantics.insert(.smoothedSceneDepth)
    } else if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
      config.frameSemantics.insert(.sceneDepth)
    }
    config.planeDetection = [.horizontal]
    sceneView.session.run(config, options: [.resetTracking, .removeExistingAnchors])
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    sceneView.session.pause()
  }

  @objc private func onCancel() {
    finish(.cancelled)
  }

  @objc private func onMeasure() {
    guard let frame = sceneView.session.currentFrame else {
      instruction.text = "Inquadratura non ancora pronta, riprova"
      return
    }
    let planes = frame.anchors.compactMap { $0 as? ARPlaneAnchor }.filter { $0.alignment == .horizontal }
    let measurement = VolumeEstimator.estimate(frame: frame, horizontalPlanes: planes)

    guard let base64 = Self.jpegBase64(from: frame) else {
      finish(.failure("Conversione immagine fallita"))
      return
    }
    let payload: [String: Any] = [
      "imageBase64": base64,
      "mimeType": "image/jpeg",
      "volumeMl": measurement.volumeMl,
      "quality": measurement.quality.rawValue,
      "hasLiDAR": true,
    ]
    finish(.success(payload))
  }

  private func finish(_ result: LidarCaptureResult) {
    if didFinish { return }
    didFinish = true
    sceneView.session.pause()
    let callback = onResult
    dismiss(animated: true) {
      callback?(result)
    }
  }

  // Converte il frame RGB ARKit in JPEG base64, ridimensionato (lato lungo <= 1024, q 0.6),
  // allineato a mobile/src/lib/mealImage.ts.
  private static func jpegBase64(from frame: ARFrame) -> String? {
    let ciImage = CIImage(cvPixelBuffer: frame.capturedImage).oriented(.right)
    let context = CIContext(options: nil)
    guard let cg = context.createCGImage(ciImage, from: ciImage.extent) else { return nil }
    let image = resize(UIImage(cgImage: cg), maxDimension: 1024)
    guard let jpeg = image.jpegData(compressionQuality: 0.6) else { return nil }
    return jpeg.base64EncodedString()
  }

  private static func resize(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
    let longest = max(image.size.width, image.size.height)
    if longest <= maxDimension { return image }
    let scale = maxDimension / longest
    let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
    let renderer = UIGraphicsImageRenderer(size: newSize)
    return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
  }
}

// MARK: - Stima del volume dalla depth map (euristica, dichiaratamente approssimata)

enum VolumeEstimator {
  static func estimate(frame: ARFrame, horizontalPlanes: [ARPlaneAnchor]) -> MealMeasurement {
    guard let sceneDepth = frame.smoothedSceneDepth ?? frame.sceneDepth else {
      return MealMeasurement(volumeMl: 0, quality: .none)
    }
    let depthMap = sceneDepth.depthMap
    let confMap = sceneDepth.confidenceMap

    CVPixelBufferLockBaseAddress(depthMap, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(depthMap, .readOnly) }
    if let confMap { CVPixelBufferLockBaseAddress(confMap, .readOnly) }
    defer { if let confMap { CVPixelBufferUnlockBaseAddress(confMap, .readOnly) } }

    let width = CVPixelBufferGetWidth(depthMap)
    let height = CVPixelBufferGetHeight(depthMap)
    guard let base = CVPixelBufferGetBaseAddress(depthMap), width > 0, height > 0 else {
      return MealMeasurement(volumeMl: 0, quality: .none)
    }
    let rowBytes = CVPixelBufferGetBytesPerRow(depthMap)
    let confBase = confMap.flatMap { CVPixelBufferGetBaseAddress($0) }
    let confRow = confMap.map { CVPixelBufferGetBytesPerRow($0) } ?? 0

    // Intrinseci della camera (riferiti alla risoluzione RGB) riscalati alla depth map.
    let intr = frame.camera.intrinsics
    let imgRes = frame.camera.imageResolution
    let sx = Float(width) / Float(imgRes.width)
    let sy = Float(height) / Float(imgRes.height)
    let fx = intr.columns.0.x * sx
    let fy = intr.columns.1.y * sy
    let cx = intr.columns.2.x * sx
    let cy = intr.columns.2.y * sy
    let camT = frame.camera.transform

    // ARWorldTracking è allineato a gravità → piano orizzontale ⇒ normale = +Y mondo.
    // Quota del piano (tavolo): dall'ancora più grande, altrimenti dalla mediana
    // dei punti dell'anello esterno (il tavolo intorno al piatto).
    var planeY: Float? = nil
    var usedAnchor = false
    if let best = horizontalPlanes.max(by: { planeArea($0) < planeArea($1) }) {
      planeY = best.transform.columns.3.y
      usedAnchor = true
    }

    func worldPoint(u: Int, v: Int, d: Float) -> SIMD3<Float> {
      let xc = (Float(u) - cx) * d / fx
      let yc = (Float(v) - cy) * d / fy
      // OpenCV (x destra, y giù, z avanti) → camera ARKit (x destra, y su, z indietro).
      let pCam = SIMD4<Float>(xc, -yc, -d, 1)
      let pw = camT * pCam
      return SIMD3<Float>(pw.x, pw.y, pw.z)
    }

    func depthAt(_ u: Int, _ v: Int) -> Float {
      let rowPtr = base.advanced(by: v * rowBytes).assumingMemoryBound(to: Float32.self)
      return rowPtr[u]
    }

    func confOK(_ u: Int, _ v: Int) -> Bool {
      guard let confBase else { return true }
      let rowPtr = confBase.advanced(by: v * confRow).assumingMemoryBound(to: UInt8.self)
      return rowPtr[u] >= UInt8(ARConfidenceLevel.medium.rawValue) // scarta low
    }

    // Fallback piano: mediana Y dell'anello esterno (oltre l'85% dal centro).
    if planeY == nil {
      var ringYs: [Float] = []
      for v in 0..<height {
        for u in 0..<width {
          let nx = abs(Float(u) - Float(width) / 2) / (Float(width) / 2)
          let ny = abs(Float(v) - Float(height) / 2) / (Float(height) / 2)
          if max(nx, ny) < 0.85 { continue }
          let d = depthAt(u, v)
          if !d.isFinite || d <= 0 || d > 5 { continue }
          if !confOK(u, v) { continue }
          ringYs.append(worldPoint(u: u, v: v, d: d).y)
        }
      }
      if !ringYs.isEmpty {
        ringYs.sort()
        planeY = ringYs[ringYs.count / 2]
      }
    }

    guard let plane = planeY else {
      return MealMeasurement(volumeMl: 0, quality: .none)
    }

    // Integrazione nella regione centrale (20%–80%): volume di ciò che sporge dal piano.
    var volumeM3: Double = 0
    var foodSamples = 0
    for v in 0..<height {
      let ny = Float(v) / Float(height)
      if ny < 0.2 || ny > 0.8 { continue }
      for u in 0..<width {
        let nx = Float(u) / Float(width)
        if nx < 0.2 || nx > 0.8 { continue }
        let d = depthAt(u, v)
        if !d.isFinite || d <= 0 || d > 5 { continue }
        if !confOK(u, v) { continue }
        let h = worldPoint(u: u, v: v, d: d).y - plane
        if h <= 0.005 || h > 0.25 { continue } // 5 mm .. 25 cm
        let pixelArea = (d / fx) * (d / fy) // area sottesa dal pixel a distanza d
        volumeM3 += Double(h) * Double(pixelArea)
        foodSamples += 1
      }
    }

    var volumeMl = volumeM3 * 1_000_000
    if !volumeMl.isFinite || volumeMl <= 0 {
      return MealMeasurement(volumeMl: 0, quality: .none)
    }
    var quality: MealQuality
    if volumeMl > 6000 {
      volumeMl = 6000
      quality = .low
    } else if foodSamples < 60 {
      quality = .low
    } else if usedAnchor {
      quality = foodSamples > 500 ? .high : .medium
    } else {
      quality = foodSamples > 500 ? .medium : .low
    }

    return MealMeasurement(volumeMl: (volumeMl * 10).rounded() / 10, quality: quality)
  }

  private static func planeArea(_ anchor: ARPlaneAnchor) -> Float {
    anchor.planeExtent.width * anchor.planeExtent.height
  }
}
