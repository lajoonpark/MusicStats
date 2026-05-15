"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

interface Props {
  onFileSelected: (file: File) => Promise<void>;
  loading: boolean;
}

export function UploadZone({ onFileSelected, loading }: Props) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = async (file?: File) => {
    if (!file) return;
    await onFileSelected(file);
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    await submit(event.dataTransfer.files?.[0]);
  };

  const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await submit(event.target.files?.[0]);
  };

  return (
    <section className="fade-in space-y-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-50">YouTube Music Stats</h1>
      <p className="mx-auto max-w-2xl text-zinc-300">
        Upload your Google Takeout history to instantly generate a personal recap.
        <br />
        Google Takeout → YouTube and YouTube Music → history
      </p>

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mx-auto mt-6 flex min-h-64 w-full max-w-3xl cursor-pointer items-center justify-center rounded-3xl border-2 border-dashed p-8 transition ${
          dragging ? "border-emerald-400 bg-emerald-500/10" : "border-zinc-600 bg-zinc-900/40"
        }`}
      >
        <div>
          <p className="text-lg font-medium text-zinc-200">
            {loading ? "Parsing your listening history..." : "Drag & drop JSON/HTML file here"}
          </p>
          <p className="mt-2 text-sm text-zinc-400">or click to browse</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={onChange}
        accept=".json,.html,.htm,application/json,text/html"
        className="hidden"
      />
    </section>
  );
}
