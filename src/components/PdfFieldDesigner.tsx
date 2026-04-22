"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  MousePointer,
  X,
  Move,
  Type,
  CheckSquare,
  Hash,
  GripVertical,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { PdfFormField, SignatureField } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfFieldDesignerProps {
  pdfUrl: string;
  templateName: string;
  existingFormFields: PdfFormField[];
  existingSignatureFields: SignatureField[];
  onSave: (fields: PdfFormField[], signatureFields: SignatureField[]) => Promise<void>;
  onClose: () => void;
}

type FieldType = PdfFormField["type"];

interface DragState {
  fieldId: string;
  startX: number;
  startY: number;
  fieldStartX: number;
  fieldStartY: number;
}

interface ResizeState {
  fieldId: string;
  startX: number;
  startY: number;
  fieldStartW: number;
  fieldStartH: number;
}

export default function PdfFieldDesigner({
  pdfUrl,
  templateName,
  existingFormFields,
  existingSignatureFields,
  onSave,
  onClose,
}: PdfFieldDesignerProps) {
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formFields, setFormFields] = useState<PdfFormField[]>(existingFormFields);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>(existingSignatureFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [pdfPageSize, setPdfPageSize] = useState({ width: 612, height: 792 });
  const [addMode, setAddMode] = useState<FieldType | "signature" | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderWidth, setRenderWidth] = useState(612);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const scale = renderWidth / pdfPageSize.width;

  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setRenderWidth(Math.min(w - 340, 850)); // leave room for sidebar
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setLoading(false);
    },
    []
  );

  const onPageLoadSuccess = useCallback(
    (page: { originalWidth: number; originalHeight: number }) => {
      setPdfPageSize({ width: page.originalWidth, height: page.originalHeight });
    },
    []
  );

  // Convert CSS position (top-left origin) to PDF points (bottom-left origin)
  const cssToPdf = (cssX: number, cssY: number, cssW: number, cssH: number) => ({
    x: cssX / scale,
    y: pdfPageSize.height - (cssY + cssH) / scale,
    width: cssW / scale,
    height: cssH / scale,
  });

  // Convert PDF points to CSS
  const pdfToCSS = (field: { x: number; y: number; width: number; height: number }) => ({
    left: field.x * scale,
    top: (pdfPageSize.height - field.y - field.height) * scale,
    width: field.width * scale,
    height: field.height * scale,
  });

  // Get which page a click happened on
  const getPageFromClick = (clientX: number, clientY: number): number | null => {
    for (const [pageIdx, el] of pageRefs.current.entries()) {
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return pageIdx;
      }
    }
    return null;
  };

  // Click on PDF page to add a new field
  const handlePageClick = (e: React.MouseEvent, pageIndex: number) => {
    if (!addMode) return;

    const pageEl = pageRefs.current.get(pageIndex);
    if (!pageEl) return;

    const rect = pageEl.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    const defaultW = addMode === "checkbox" ? 14 : addMode === "signature" ? 200 : 160;
    const defaultH = addMode === "checkbox" ? 14 : addMode === "signature" ? 60 : 18;
    const defaultWCss = defaultW * scale;
    const defaultHCss = defaultH * scale;

    const pdfCoords = cssToPdf(cssX, cssY, defaultWCss, defaultHCss);
    const id = `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (addMode === "signature") {
      const newSigField: SignatureField = {
        id,
        role: "candidate",
        page: pageIndex,
        x: pdfCoords.x,
        y: pdfCoords.y,
        width: pdfCoords.width,
        height: pdfCoords.height,
      };
      setSignatureFields((prev) => [...prev, newSigField]);
    } else {
      const newField: PdfFormField = {
        id,
        label: `${addMode}_${formFields.length + 1}`,
        type: addMode,
        page: pageIndex,
        x: pdfCoords.x,
        y: pdfCoords.y,
        width: pdfCoords.width,
        height: pdfCoords.height,
        fontSize: addMode === "checkbox" ? undefined : 10,
      };
      setFormFields((prev) => [...prev, newField]);
    }

    setSelectedFieldId(id);
    setAddMode(null);
  };

  // Drag start
  const handleDragStart = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const field =
      formFields.find((f) => f.id === fieldId) ||
      signatureFields.find((f) => f.id === fieldId);
    if (!field) return;

    setDragState({
      fieldId,
      startX: e.clientX,
      startY: e.clientY,
      fieldStartX: field.x,
      fieldStartY: field.y,
    });
    setSelectedFieldId(fieldId);
  };

  // Resize start
  const handleResizeStart = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const field =
      formFields.find((f) => f.id === fieldId) ||
      signatureFields.find((f) => f.id === fieldId);
    if (!field) return;

    setResizeState({
      fieldId,
      startX: e.clientX,
      startY: e.clientY,
      fieldStartW: field.width,
      fieldStartH: field.height,
    });
  };

  // Mouse move for drag/resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState) {
        const dx = (e.clientX - dragState.startX) / scale;
        const dy = -(e.clientY - dragState.startY) / scale; // inverted: CSS down = PDF y decrease

        const updateFn = (f: { id: string; x: number; y: number }) =>
          f.id === dragState.fieldId
            ? { ...f, x: Math.max(0, dragState.fieldStartX + dx), y: dragState.fieldStartY + dy }
            : f;

        setFormFields((prev) => prev.map((f) => updateFn(f) as PdfFormField));
        setSignatureFields((prev) => prev.map((f) => updateFn(f) as SignatureField));
      }

      if (resizeState) {
        const dw = (e.clientX - resizeState.startX) / scale;
        const dh = (e.clientY - resizeState.startY) / scale;

        const updateFn = (f: { id: string; width: number; height: number }) =>
          f.id === resizeState.fieldId
            ? {
                ...f,
                width: Math.max(10, resizeState.fieldStartW + dw),
                height: Math.max(10, resizeState.fieldStartH + dh),
              }
            : f;

        setFormFields((prev) => prev.map((f) => updateFn(f) as PdfFormField));
        setSignatureFields((prev) => prev.map((f) => updateFn(f) as SignatureField));
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    if (dragState || resizeState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, resizeState, scale]);

  const deleteField = (id: string) => {
    setFormFields((prev) => prev.filter((f) => f.id !== id));
    setSignatureFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const updateFormField = (id: string, updates: Partial<PdfFormField>) => {
    setFormFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formFields, signatureFields);
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  };

  const selectedField =
    formFields.find((f) => f.id === selectedFieldId) ||
    signatureFields.find((f) => f.id === selectedFieldId);
  const isSignatureField = signatureFields.some((f) => f.id === selectedFieldId);

  const typeIcon: Record<string, React.ReactNode> = {
    text: <Type className="h-3.5 w-3.5" />,
    checkbox: <CheckSquare className="h-3.5 w-3.5" />,
    ssn: <Hash className="h-3.5 w-3.5" />,
    ein: <Hash className="h-3.5 w-3.5" />,
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
          <h3 className="font-semibold text-gray-900">
            Field Designer — {templateName}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {formFields.length} fields · {signatureFields.length} signature
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Positions
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar — Toolbox + Field List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
          {/* Add field tools */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Add Field (click on PDF)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { type: "text" as const, label: "Text", icon: <Type className="h-4 w-4" /> },
                  { type: "checkbox" as const, label: "Check", icon: <CheckSquare className="h-4 w-4" /> },
                  { type: "ssn" as const, label: "SSN", icon: <Hash className="h-4 w-4" /> },
                  { type: "ein" as const, label: "EIN", icon: <Hash className="h-4 w-4" /> },
                  { type: "signature" as const, label: "Sign", icon: <MousePointer className="h-4 w-4" /> },
                ] as { type: FieldType | "signature"; label: string; icon: React.ReactNode }[]
              ).map((tool) => (
                <button
                  key={tool.type}
                  onClick={() => setAddMode(addMode === tool.type ? null : tool.type)}
                  className={`flex flex-col items-center gap-1 py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                    addMode === tool.type
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tool.icon}
                  {tool.label}
                </button>
              ))}
            </div>
            {addMode && (
              <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                Click on the PDF to place a <strong>{addMode}</strong> field
              </p>
            )}
          </div>

          {/* Field List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
              Fields ({formFields.length + signatureFields.length})
            </p>

            {formFields.map((f) => (
              <div
                key={f.id}
                onClick={() => {
                  setSelectedFieldId(f.id);
                  setEditingField(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm group ${
                  selectedFieldId === f.id
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className="flex-shrink-0 text-gray-400">
                  {typeIcon[f.type]}
                </span>
                <span className="flex-1 truncate font-medium">{f.label}</span>
                <span className="text-[10px] text-gray-400">p{f.page + 1}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteField(f.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {signatureFields.map((f) => (
              <div
                key={f.id}
                onClick={() => {
                  setSelectedFieldId(f.id);
                  setEditingField(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm group ${
                  selectedFieldId === f.id
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <MousePointer className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate font-medium">Signature ({f.role})</span>
                <span className="text-[10px] text-gray-400">p{f.page + 1}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteField(f.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {formFields.length === 0 && signatureFields.length === 0 && (
              <p className="text-xs text-gray-400 px-1 py-4 text-center">
                No fields yet. Select a field type above, then click on the PDF to place it.
              </p>
            )}
          </div>

          {/* Selected Field Properties */}
          {selectedField && (
            <div className="border-t border-gray-200 p-4 space-y-3 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Properties
              </p>

              {!isSignatureField && (
                <>
                  <div>
                    <label className="text-xs text-gray-500">Label</label>
                    <input
                      type="text"
                      value={(selectedField as PdfFormField).label}
                      onChange={(e) =>
                        updateFormField(selectedField.id, { label: e.target.value })
                      }
                      className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Type</label>
                    <select
                      value={(selectedField as PdfFormField).type}
                      onChange={(e) =>
                        updateFormField(selectedField.id, {
                          type: e.target.value as FieldType,
                        })
                      }
                      className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="text">Text</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="ssn">SSN</option>
                      <option value="ein">EIN</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Group (optional)</label>
                    <input
                      type="text"
                      value={(selectedField as PdfFormField).group || ""}
                      onChange={(e) =>
                        updateFormField(selectedField.id, {
                          group: e.target.value || undefined,
                        })
                      }
                      placeholder="e.g. taxClassification"
                      className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Font Size</label>
                    <input
                      type="number"
                      value={(selectedField as PdfFormField).fontSize || 10}
                      onChange={(e) =>
                        updateFormField(selectedField.id, {
                          fontSize: parseInt(e.target.value) || 10,
                        })
                      }
                      min={6}
                      max={24}
                      className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">X (pts)</label>
                  <input
                    type="number"
                    value={Math.round(selectedField.x)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (isSignatureField) {
                        setSignatureFields((prev) =>
                          prev.map((f) => (f.id === selectedField.id ? { ...f, x: val } : f))
                        );
                      } else {
                        updateFormField(selectedField.id, { x: val });
                      }
                    }}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Y (pts)</label>
                  <input
                    type="number"
                    value={Math.round(selectedField.y)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (isSignatureField) {
                        setSignatureFields((prev) =>
                          prev.map((f) => (f.id === selectedField.id ? { ...f, y: val } : f))
                        );
                      } else {
                        updateFormField(selectedField.id, { y: val });
                      }
                    }}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Width (pts)</label>
                  <input
                    type="number"
                    value={Math.round(selectedField.width)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 10;
                      if (isSignatureField) {
                        setSignatureFields((prev) =>
                          prev.map((f) => (f.id === selectedField.id ? { ...f, width: val } : f))
                        );
                      } else {
                        updateFormField(selectedField.id, { width: val });
                      }
                    }}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Height (pts)</label>
                  <input
                    type="number"
                    value={Math.round(selectedField.height)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 10;
                      if (isSignatureField) {
                        setSignatureFields((prev) =>
                          prev.map((f) => (f.id === selectedField.id ? { ...f, height: val } : f))
                        );
                      } else {
                        updateFormField(selectedField.id, { height: val });
                      }
                    }}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Page</label>
                <input
                  type="number"
                  value={selectedField.page + 1}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(numPages - 1, (parseInt(e.target.value) || 1) - 1));
                    if (isSignatureField) {
                      setSignatureFields((prev) =>
                        prev.map((f) => (f.id === selectedField.id ? { ...f, page: val } : f))
                      );
                    } else {
                      updateFormField(selectedField.id, { page: val });
                    }
                  }}
                  min={1}
                  max={numPages}
                  className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                onClick={() => deleteField(selectedField.id)}
                className="w-full mt-2 text-red-600 hover:bg-red-50 text-sm py-1.5 rounded-md border border-red-200 flex items-center justify-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Field
              </button>
            </div>
          )}
        </div>

        {/* PDF Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-200 flex justify-center"
        >
          <div className="py-6">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            )}

            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={null}
              className="flex flex-col items-center gap-6"
            >
              {Array.from(new Array(numPages), (_, index) => (
                <div
                  key={`page_${index}`}
                  ref={(el) => {
                    if (el) pageRefs.current.set(index, el);
                  }}
                  className="shadow-lg rounded-lg overflow-hidden relative bg-white"
                  style={{
                    width: renderWidth,
                    cursor: addMode ? "crosshair" : "default",
                  }}
                  onClick={(e) => handlePageClick(e, index)}
                >
                  <Page
                    pageNumber={index + 1}
                    width={renderWidth}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadSuccess={index === 0 ? onPageLoadSuccess : undefined}
                  />

                  {/* Page number badge */}
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                    Page {index + 1}
                  </div>

                  {/* Form field overlays */}
                  {formFields
                    .filter((f) => f.page === index)
                    .map((field) => {
                      const pos = pdfToCSS(field);
                      const isSelected = selectedFieldId === field.id;
                      return (
                        <div
                          key={field.id}
                          style={{
                            position: "absolute",
                            left: pos.left,
                            top: pos.top,
                            width: pos.width,
                            height: pos.height,
                            zIndex: isSelected ? 20 : 10,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFieldId(field.id);
                          }}
                          onMouseDown={(e) => {
                            if (!addMode) handleDragStart(e, field.id);
                          }}
                          className={`border-2 rounded-sm cursor-move flex items-center ${
                            isSelected
                              ? "border-blue-500 bg-blue-100/60"
                              : "border-blue-300/60 bg-blue-50/40 hover:border-blue-400"
                          }`}
                        >
                          <span
                            className="text-[10px] text-blue-700 truncate px-1 select-none pointer-events-none"
                            style={{ lineHeight: `${pos.height}px` }}
                          >
                            {field.label}
                          </span>

                          {/* Resize handle */}
                          {isSelected && (
                            <div
                              onMouseDown={(e) => handleResizeStart(e, field.id)}
                              className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-600 rounded-sm cursor-se-resize"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      );
                    })}

                  {/* Signature field overlays */}
                  {signatureFields
                    .filter((f) => f.page === index)
                    .map((field) => {
                      const pos = pdfToCSS(field);
                      const isSelected = selectedFieldId === field.id;
                      return (
                        <div
                          key={field.id}
                          style={{
                            position: "absolute",
                            left: pos.left,
                            top: pos.top,
                            width: pos.width,
                            height: pos.height,
                            zIndex: isSelected ? 20 : 10,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFieldId(field.id);
                          }}
                          onMouseDown={(e) => {
                            if (!addMode) handleDragStart(e, field.id);
                          }}
                          className={`border-2 border-dashed rounded-sm cursor-move flex items-center justify-center ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-100/60"
                              : "border-emerald-300/60 bg-emerald-50/40 hover:border-emerald-400"
                          }`}
                        >
                          <span className="text-[10px] text-emerald-700 select-none pointer-events-none">
                            ✍ Signature
                          </span>

                          {isSelected && (
                            <div
                              onMouseDown={(e) => handleResizeStart(e, field.id)}
                              className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-600 rounded-sm cursor-se-resize"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </Document>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
        <span>
          PDF size: {Math.round(pdfPageSize.width)} × {Math.round(pdfPageSize.height)} pts
          · Scale: {scale.toFixed(2)}x · {numPages} page{numPages !== 1 ? "s" : ""}
        </span>
        <span>
          Drag fields to reposition · Drag bottom-right corner to resize
        </span>
      </div>
    </div>
  );
}
