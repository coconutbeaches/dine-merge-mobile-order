import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfilePicture, deleteProfilePicture } from '@/services/userProfileService';

interface ProfilePictureUploaderProps {
  userId: string;
  currentAvatarUrl: string | null;
  currentAvatarPath: string | null;
  onUpdate: (newAvatarUrl: string | null, newAvatarPath: string | null) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProfilePictureUploader({
  userId,
  currentAvatarUrl,
  currentAvatarPath,
  onUpdate,
  className = '',
  size = 'md',
}: ProfilePictureUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const { success, url, path, error } = await updateProfilePicture(userId, file);
      
      if (success && url && path) {
        onUpdate(url, path);
        toast.success('Profile picture updated successfully');
      } else if (error) {
        toast.error(`Failed to update profile picture: ${error}`);
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      toast.error('An error occurred while updating the profile picture');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [userId, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!currentAvatarPath) return;
    
    if (!window.confirm('Are you sure you want to remove this profile picture?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { success, error } = await deleteProfilePicture(userId, currentAvatarPath);
      
      if (success) {
        onUpdate(null, null);
        toast.success('Profile picture removed');
      } else if (error) {
        toast.error(`Failed to remove profile picture: ${error}`);
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      toast.error('An error occurred while removing the profile picture');
    } finally {
      setIsDeleting(false);
    }
  }, [userId, currentAvatarPath, onUpdate]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative group ${className}`}>
      <Avatar className={`${sizeClasses[size]} cursor-pointer`} onClick={handleClick}>
        <AvatarImage src={currentAvatarUrl || ''} alt="Profile" />
        <AvatarFallback className="bg-muted">
          <User className={`${iconSizes[size]} text-muted-foreground`} />
        </AvatarFallback>
      </Avatar>
      
      <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full bg-background/80 hover:bg-background/100 h-8 w-8"
          onClick={handleClick}
          disabled={isUploading || isDeleting}
        >
          {isUploading ? (
            <Loader2 className={`${iconSizes[size]} animate-spin`} />
          ) : (
            <Camera className={iconSizes[size]} />
          )}
        </Button>
        
        {currentAvatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-background/80 hover:bg-background/100 h-8 w-8 ml-1"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isUploading || isDeleting}
          >
            {isDeleting ? (
              <Loader2 className={`${iconSizes[size]} animate-spin`} />
            ) : (
              <X className={iconSizes[size]} />
            )}
          </Button>
        )}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={isUploading || isDeleting}
      />
    </div>
  );
}
