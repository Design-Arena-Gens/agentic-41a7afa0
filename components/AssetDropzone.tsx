"use client";

import { useCallback, useRef, useState } from "react";
import clsx from "clsx";

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export function AssetDropzone({ onFiles, accept, multiple = true }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOver, setIsOver] = useState(false);

  const pick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(multiple ? files : [files[0]]);
  }, [onFiles, multiple]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) onFiles(multiple ? files : [files[0]]);
  }, [onFiles, multiple]);

  return (
    <div
      onClick={pick}
      onDragOver={(e)=>{ e.preventDefault(); setIsOver(true); }}
      onDragLeave={(e)=>{ e.preventDefault(); setIsOver(false); }}
      onDrop={onDrop}
      className={clsx("border border-dashed rounded-lg p-4 cursor-pointer transition", isOver ? "border-brand-500 bg-brand-500/10" : "border-white/15 bg-white/5")}
    >
      <input ref={inputRef} className="hidden" type="file" multiple={multiple} accept={accept} onChange={onInputChange} />
      <div className="text-sm text-white/80">
        <div className="font-medium">Click to select or drag & drop</div>
        <div className="text-xs text-white/60">{accept ?? "Any file"}{multiple ? " ? multiple allowed" : ""}</div>
      </div>
    </div>
  );
}
