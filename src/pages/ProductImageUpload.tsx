
import React from "react";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { Trash2 } from "lucide-react";

// This handles image upload logic, drag'n'drop, & preview
const ProductImageUpload = ({
  form,
  imagePreview,
  setImagePreview,
  fileInputRef,
  handleImageChange,
  isDragging,
  setIsDragging
}) => (
  <div className="mt-6">
    <FormLabel htmlFor="image">Images</FormLabel>
    <div className="mt-2">
      {imagePreview && (
        <div className="relative w-24 h-24 mb-4">
          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-md border" />
          <button
            type="button"
            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md"
            onClick={() => {
              setImagePreview(null);
              form.setValue('image', null);
            }}
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        </div>
      )}

      {!imagePreview && (
        <div
          className={`
            border-2 border-dashed rounded-md p-8 text-center transition-all
            ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white'}
            cursor-pointer
          `}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={e => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            const droppedFile = e.dataTransfer.files?.[0];
            if (droppedFile && droppedFile.type.startsWith("image/")) {
              handleImageChange(droppedFile);
            }
          }}
        >
          <Input
            id="image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleImageChange(e)}
            ref={fileInputRef}
          />
          <div className="flex flex-col items-center pointer-events-none">
            <span className="text-sm text-gray-600">
              Drag a file here or click to select one
            </span>
            <span className="text-xs text-gray-400 mt-1">
              File should not exceed 10MB. Recommended ratio is 1:1.
            </span>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default ProductImageUpload;
