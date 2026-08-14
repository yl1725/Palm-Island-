import Foundation
import Vision
import AppKit

guard CommandLine.arguments.count > 1 else {
    print("usage: ocr <image>")
    exit(1)
}

let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("ERR: cannot load image")
    exit(1)
}

let request = VNRecognizeTextRequest { req, _ in
    guard let obs = req.results as? [VNRecognizedTextObservation] else { return }
    // sort: top-to-bottom by row, left-to-right within a row
    let sorted = obs.sorted { a, b in
        let ay = a.boundingBox.midY, by = b.boundingBox.midY
        if abs(ay - by) > 0.008 { return ay > by }
        return a.boundingBox.minX < b.boundingBox.minX
    }
    for o in sorted {
        if let c = o.topCandidates(1).first {
            print(c.string)
        }
    }
}
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["en-US"]

let handler = VNImageRequestHandler(cgImage: cg, options: [:])
do {
    try handler.perform([request])
} catch {
    print("ERR: \(error)")
    exit(1)
}
