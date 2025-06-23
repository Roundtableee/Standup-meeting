import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, AlertCircle } from 'lucide-react';

interface ProfilePictureUploadProps {
  currentPicture?: string;
  onUpload: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  onRemove?: () => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
  className?: string;
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentPicture,
  onUpload,
  onRemove,
  loading = false,
  className = ''
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setMessage(null);

    try {
      const result = await onUpload(file);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
        setPreview(null);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to upload image' });
        setPreview(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while uploading' });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;

    setUploading(true);
    setMessage(null);

    try {
      const result = await onRemove();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Profile picture removed successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to remove image' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while removing image' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const displayImage = preview || currentPicture;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Message Display */}
      {message && (
        <div className={`p-3 rounded-lg border text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Profile Picture Display */}
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
            {displayImage ? (
              <img
                src={displayImage}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                <Camera className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
          
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Profile Picture</h4>
          <p className="text-sm text-gray-600 mb-4">
            Upload a new profile picture. Recommended size: 400x400px. Max size: 5MB.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleClick}
              disabled={uploading || loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New
            </button>
            
            {currentPicture && onRemove && (
              <button
                onClick={handleRemove}
                disabled={uploading || loading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Drag and Drop Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${uploading || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="space-y-2">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Upload className="h-full w-full" />
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium text-blue-600 hover:text-blue-500">
              Click to upload
            </span>
            {' '}or drag and drop
          </div>
          <p className="text-xs text-gray-500">
            PNG, JPG, GIF up to 5MB
          </p>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};

export default ProfilePictureUpload;