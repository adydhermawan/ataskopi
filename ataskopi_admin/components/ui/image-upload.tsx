"use client";

import { useState } from "react";
import { Trash, ImagePlus, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploadProps {
    disabled?: boolean;
    onChange: (value: string) => void;
    onRemove: (value: string) => void;
    value: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    disabled,
    onChange,
    onRemove,
    value
}) => {
    const [loading, setLoading] = useState(false);

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (data.success) {
                onChange(data.url);
                toast.success("Image uploaded");
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-4 flex items-center gap-4">
                {value ? (
                    <div className="relative w-[200px] h-[200px] rounded-md overflow-hidden">
                        <div className="z-10 absolute top-2 right-2">
                            <Button type="button" onClick={() => onRemove(value)} variant="destructive" size="sm">
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                        <Image
                            fill
                            className="object-cover"
                            alt="Image"
                            src={value}
                        />
                    </div>
                ) : (
                    <div className="w-[200px] h-[200px] rounded-md border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                        {loading ? (
                            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                        ) : (
                            <ImagePlus className="h-10 w-10 text-muted-foreground" />
                        )}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-x-4">
                <Button
                    type="button"
                    disabled={disabled || loading}
                    variant="secondary"
                    onClick={() => document.getElementById('image-upload-input')?.click()}
                >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Upload an Image
                </Button>
                <input
                    id="image-upload-input"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={onUpload}
                />
            </div>
        </div>
    );
};

export default ImageUpload;
