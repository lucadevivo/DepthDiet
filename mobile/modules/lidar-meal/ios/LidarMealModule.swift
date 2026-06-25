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
    // `title` (opz.) è il nome del pasto, mostrato nella top bar come in expo-camera.
    AsyncFunction("captureMeal") { (title: String?, promise: Promise) in
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
        vc.mealTitle = title
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
  /// Nome del pasto mostrato nella top bar (come in expo-camera).
  var mealTitle: String?

  private let sceneView = ARSCNView()
  private let titleLabel = UILabel()
  private let closeButton = UIButton(type: .system)
  private let shutterButton = UIButton(type: .custom)
  private let shutterInner = UIView()
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

  // Overlay identico alla schermata expo-camera: top bar (chiudi + nome pasto) e
  // otturatore tondo bianco in basso. Niente mirino/istruzioni: il feed AR fa da
  // anteprima come una fotocamera qualsiasi; la depth viene letta allo scatto.
  private func setupOverlay() {
    closeButton.translatesAutoresizingMaskIntoConstraints = false
    closeButton.setTitle("✕", for: .normal)
    closeButton.setTitleColor(.white, for: .normal)
    closeButton.titleLabel?.font = .systemFont(ofSize: 24, weight: .semibold)
    closeButton.addTarget(self, action: #selector(onCancel), for: .touchUpInside)
    view.addSubview(closeButton)

    titleLabel.translatesAutoresizingMaskIntoConstraints = false
    titleLabel.text = mealTitle
    titleLabel.textColor = .white
    titleLabel.font = .systemFont(ofSize: 16, weight: .bold)
    titleLabel.textAlignment = .center
    titleLabel.layer.shadowColor = UIColor.black.cgColor
    titleLabel.layer.shadowOpacity = 0.6
    titleLabel.layer.shadowRadius = 3
    titleLabel.layer.shadowOffset = .zero
    view.addSubview(titleLabel)

    // Otturatore: stesse misure dello shutter di expo-camera (76/56, anello bianco).
    shutterButton.translatesAutoresizingMaskIntoConstraints = false
    shutterButton.layer.cornerRadius = 38
    shutterButton.layer.borderWidth = 5
    shutterButton.layer.borderColor = UIColor.white.cgColor
    shutterButton.backgroundColor = UIColor.white.withAlphaComponent(0.15)
    shutterButton.addTarget(self, action: #selector(onMeasure), for: .touchUpInside)
    view.addSubview(shutterButton)

    shutterInner.translatesAutoresizingMaskIntoConstraints = false
    shutterInner.backgroundColor = .white
    shutterInner.layer.cornerRadius = 28
    shutterInner.isUserInteractionEnabled = false
    shutterButton.addSubview(shutterInner)

    NSLayoutConstraint.activate([
      closeButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
      closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
      closeButton.widthAnchor.constraint(equalToConstant: 36),
      closeButton.heightAnchor.constraint(equalToConstant: 36),

      titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      titleLabel.centerYAnchor.constraint(equalTo: closeButton.centerYAnchor),
      titleLabel.leadingAnchor.constraint(greaterThanOrEqualTo: closeButton.trailingAnchor, constant: 8),
      titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -52),

      shutterButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      shutterButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -28),
      shutterButton.widthAnchor.constraint(equalToConstant: 76),
      shutterButton.heightAnchor.constraint(equalToConstant: 76),

      shutterInner.centerXAnchor.constraint(equalTo: shutterButton.centerXAnchor),
      shutterInner.centerYAnchor.constraint(equalTo: shutterButton.centerYAnchor),
      shutterInner.widthAnchor.constraint(equalToConstant: 56),
      shutterInner.heightAnchor.constraint(equalToConstant: 56),
    ])
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
    // Se il primo frame AR non è ancora pronto, ignora il tap (niente messaggi a schermo).
    guard let frame = sceneView.session.currentFrame else { return }
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
