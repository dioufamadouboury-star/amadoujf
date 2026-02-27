import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, Check, X, Pen } from "lucide-react";

const SignaturePad = forwardRef(({ onSave, width = 400, height = 200 }, ref) => {
  const sigCanvas = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useImperativeHandle(ref, () => ({
    clear: () => {
      sigCanvas.current?.clear();
      setIsEmpty(true);
    },
    getSignature: () => {
      if (sigCanvas.current?.isEmpty()) return null;
      return sigCanvas.current.toDataURL("image/png");
    },
    isEmpty: () => sigCanvas.current?.isEmpty() ?? true,
  }));

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigCanvas.current?.isEmpty()) return;
    const dataUrl = sigCanvas.current.toDataURL("image/png");
    onSave?.(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-white">
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            width,
            height,
            className: "signature-canvas w-full",
            style: { width: "100%", height: `${height}px` },
          }}
          backgroundColor="white"
          penColor="black"
          onBegin={() => setIsEmpty(false)}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <Pen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Signez ici</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Eraser className="w-4 h-4" />
          Effacer
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="w-4 h-4" />
          Valider
        </button>
      </div>
    </div>
  );
});

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
