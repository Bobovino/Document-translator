import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileDropZoneProps {
  onFileDrop: (file: File) => void;
  accept: string; // This will be converted to proper MIME types
  file: File | null;
  isLoading?: boolean; // Add this prop
}

const FileDropZone: React.FC<FileDropZoneProps> = ({ onFileDrop, accept, file, isLoading = false }) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      console.log('Archivos recibidos:', acceptedFiles);
      if (acceptedFiles.length > 0) {
        onFileDrop(acceptedFiles[0]);
      }
    },
    [onFileDrop]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    // Simplifica la aceptación de archivos para evitar problemas
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/epub+zip': ['.epub'],
      'application/octet-stream': ['.mobi'],
    },
    maxFiles: 1,
    multiple: false,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: (rejectedFiles) => {
      console.log('Archivos rechazados:', rejectedFiles);
      setIsDragActive(false);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
        ${isDragActive ? 'border-blue-500 bg-blue-500 bg-opacity-10' : 'border-gray-600 hover:border-gray-400 bg-gray-700 bg-opacity-30'}
      `}
    >
      <input {...getInputProps()} />
      
      {isLoading ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-sm font-medium">Extracting text from PDF...</p>
        </div>
      ) : file ? (
        <div className="flex flex-col items-center">
          <svg className="w-8 h-8 mb-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-xs text-gray-400 mt-1">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <p className="text-sm font-medium">Arrastra un archivo aquí o haz clic para seleccionar</p>
          <p className="text-xs text-gray-400 mt-1">
            Puedes subir un archivo .txt, .pdf, .epub o .mobi
          </p>
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
