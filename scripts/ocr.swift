import Foundation
import Vision
import AppKit

// Usage: swift ocr.swift <image> <out.json>
// Upscales + tiles the image, runs Vision OCR, emits per-word boxes in original pixel coords.
let args = CommandLine.arguments
guard let img = NSImage(contentsOfFile: args[1]),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fatalError("load") }
let W = cg.width, H = cg.height
let scale = args.count > 3 ? Int(args[3])! : 4
let tile = args.count > 4 ? Int(args[4])! : 240, overlap = args.count > 5 ? Int(args[5])! : 40
struct Word: Codable { var t: String; var x: Double; var y: Double; var w: Double; var h: Double; var c: Double }
var words: [Word] = []

func crop(_ x: Int, _ y: Int, _ w: Int, _ h: Int) -> CGImage? {
    guard let c = cg.cropping(to: CGRect(x: x, y: y, width: w, height: h)) else { return nil }
    let sw = w*scale, sh = h*scale
    let ctx = CGContext(data: nil, width: sw, height: sh, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.interpolationQuality = .high
    ctx.draw(c, in: CGRect(x: 0, y: 0, width: sw, height: sh))
    return ctx.makeImage()
}

var y0 = 0
while y0 < H {
    var x0 = 0
    let th = min(tile, H - y0)
    while x0 < W {
        let tw = min(tile, W - x0)
        if let ci = crop(x0, y0, tw, th) {
            let req = VNRecognizeTextRequest()
            req.recognitionLevel = .accurate
            req.usesLanguageCorrection = false
            req.minimumTextHeight = 0.0
            req.recognitionLanguages = ["en-US"]
            let h = VNImageRequestHandler(cgImage: ci, options: [:])
            try? h.perform([req])
            for obs in req.results ?? [] {
                guard let cand = obs.topCandidates(1).first else { continue }
                let s = cand.string
                var idx = s.startIndex
                while idx < s.endIndex {
                    while idx < s.endIndex && s[idx] == " " { idx = s.index(after: idx) }
                    if idx >= s.endIndex { break }
                    var e = idx
                    while e < s.endIndex && s[e] != " " { e = s.index(after: e) }
                    let r = idx..<e
                    if let box = try? cand.boundingBox(for: r) {
                        let b = box.boundingBox
                        let px = Double(x0) + b.minX * Double(tw)
                        let py = Double(y0) + (1 - b.maxY) * Double(th)
                        words.append(Word(t: String(s[r]), x: px, y: py, w: b.width * Double(tw), h: b.height * Double(th), c: Double(cand.confidence)))
                    }
                    idx = e
                }
            }
        }
        x0 += tile - overlap
        if x0 + overlap >= W { break }
    }
    y0 += tile - overlap
    if y0 + overlap >= H { break }
}
try! JSONEncoder().encode(words).write(to: URL(fileURLWithPath: args[2]))
print("words:", words.count)
