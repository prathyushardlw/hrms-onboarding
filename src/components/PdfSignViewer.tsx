"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, Pen, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfSignViewerProps {
  pdfUrl: string;
  documentName: string;
  isSigned: boolean;
  onSign: (signatureDataUrl: string) => Promise<void>;
  onClose: () => void;
}

export default function PdfSignViewer({
  pdfUrl,
  documentName,
  isSigned,
  onSign,
  onClose,
}: PdfSignViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signing, setSigning] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(600);

  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setPageWidth(Math.min(w - 32, 800));
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  const handleSign = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    setSigning(true);
    try {
      const dataUrl = sigRef.current.toDataURL("image/png");
      await onSign(dataUrl);
      setShowSignaturePad(false);
    } catch (err) {
      console.error("Signing failed:", err);
    }
    setSigning(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
            {documentName}
          </h3>
          {isSigned && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Check className="h-3 w-3" /> Signed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isSigned && (
            <button
              onClick={() => {
                setCurrentPage(numPages); // Go to last page where signature box is
                setShowSignaturePad(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Pen className="h-4 w-4" />
              Sign Document
            </button>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 flex justify-center">
        <div className="py-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            className="flex flex-col items-center gap-4"
          >
            {/* Render all pages for scrolling */}
            {Array.from(new Array(numPages), (_, index) => (
              <div key={`page_${index + 1}`} className="shadow-lg rounded-lg overflow-hidden">
                <Page
                  pageNumber={index + 1}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* Page navigation */}
      {numPages > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-center gap-4 flex-shrink-0">
          <span className="text-sm text-gray-600">
            {numPages} page{numPages !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Sign: {documentName}
              </h3>
              <button
                onClick={() => setShowSignaturePad(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-3">
              Draw your signature below. This will be embedded into the PDF document.
            </p>

            <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
              <SignatureCanvas
                ref={(ref) => {
                  sigRef.current = ref;
                }}
                canvasProps={{
                  className: "w-full",
                  style: { width: "100%", height: "180px" },
                }}
                backgroundColor="white"
                penColor="black"
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => sigRef.current?.clear()}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSignaturePad(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {signing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pen className="h-4 w-4" />
                  )}
                  Apply Signature to PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
