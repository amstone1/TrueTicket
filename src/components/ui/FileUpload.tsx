'use client';

import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  value?: File | File[] | null;
  onChange?: (files: File | File[] | null) => void;
  preview?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

export function FileUpload({
  label,
  accept = 'image/*',
  maxSize = 5,
  multiple = false,
  value,
  onChange,
  preview = true,
  error,
  hint,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        return; // Skip files that are too large
      }
      validFiles.push(file);

      // Create preview for images
      if (preview && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newPreviews.push(url);
      }
    });

    if (validFiles.length === 0) return;

    // Update previews
    setPreviewUrls((prev) => {
      // Revoke old URLs
      prev.forEach((url) => URL.revokeObjectURL(url));
      return multiple ? [...prev, ...newPreviews] : newPreviews;
    });

    // Call onChange
    if (multiple) {
      const currentFiles = Array.isArray(value) ? value : [];
      onChange?.([...currentFiles, ...validFiles]);
    } else {
      onChange?.(validFiles[0]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    if (multiple && Array.isArray(value)) {
      const newFiles = value.filter((_, i) => i !== index);
      onChange?.(newFiles.length > 0 ? newFiles : null);
    } else {
      onChange?.(null);
    }

    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const hasFiles = multiple ? Array.isArray(value) && value.length > 0 : !!value;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Upload area */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
          'flex flex-col items-center justify-center text-center',
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : error
              ? 'border-red-300 hover:border-red-400'
              : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="sr-only"
        />

        <Upload className={cn('w-10 h-10 mb-3', isDragging ? 'text-indigo-500' : 'text-gray-400')} />
        <p className="text-sm text-gray-600">
          <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {accept === 'image/*' ? 'PNG, JPG, GIF' : accept} up to {maxSize}MB
        </p>
      </div>

      {/* Previews */}
      {preview && previewUrls.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {previewUrls.map((url, index) => (
            <div
              key={url}
              className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group"
            >
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File list for non-image files */}
      {!preview && hasFiles && (
        <div className="mt-3 space-y-2">
          {(() => {
            const files: File[] = multiple && Array.isArray(value) ? value.filter((f): f is File => f instanceof File) : value && !Array.isArray(value) ? [value] : [];
            return files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ImageIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ));
          })()}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}
