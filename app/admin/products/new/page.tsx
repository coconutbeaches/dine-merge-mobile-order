'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/context/UserContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Plus } from 'lucide-react';
import ProductOptionsManager from '@/components/ProductOptionsManager';
import type { ProductOption } from '@/types/supabaseTypes';

interface FormValues {
  name: string;
  price: string;
  description: string;
  category_id: string | null;
  image: File | null;
}

interface Category {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { currentUser, isLoading: userLoading } = useUserContext();
  
  // UI state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);

  // Check if user is authenticated
  useEffect(() => {
    if (!userLoading && !currentUser) {
      toast.error('Please log in to create products');
      router.push('/login');
    }
  }, [currentUser, userLoading, router]);
  
  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      price: '',
      description: '',
      category_id: null,
      image: null,
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('sort_order', { ascending: true });
      if (error) {
        console.error('Categories fetch error:', error);
        throw error;
      }
      return data as Category[];
    },
    enabled: !!currentUser, // Only fetch if user is authenticated
  });

  // Image upload helper
  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${nanoid()}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase
      .storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase
      .storage
      .from('products')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log('Creating product with data:', data);
      
      let imageUrl = null;
      if (data.image) {
        console.log('Uploading image...');
        imageUrl = await uploadImage(data.image);
        console.log('Image uploaded:', imageUrl);
      }

      console.log('Inserting product into database...');
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert([{
          name: data.name,
          description: data.description,
          price: parseFloat(data.price),
          image_url: imageUrl,
          category_id: data.category_id,
        }])
        .select()
        .single();

      console.log('Product insert result:', { newProduct, error });
      if (error) throw error;

      // Insert options
      if (options.length > 0) {
        for (const option of options) {
          const { data: newOption, error: optionError } = await supabase
            .from("product_options")
            .insert([{
              product_id: newProduct.id,
              name: option.name,
              required: option.required,
              selection_type: option.selection_type,
              max_selections: option.max_selections,
              sort_order: option.sort_order
            }])
            .select()
            .single();
          if (optionError) throw optionError;
          if (option.choices && option.choices.length > 0) {
            const choicesData = option.choices.map((choice, index) => ({
              option_id: newOption.id,
              name: choice.name,
              price_adjustment: choice.price_adjustment,
              sort_order: index
            }));
            const { error: choicesError } = await supabase
              .from("product_option_choices")
              .insert(choicesData);
            if (choicesError) throw choicesError;
          }
        }
      }
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['menu-products'] });
      toast.success('Product created successfully');
      router.push('/admin/products');
    },
    onError: (error) => {
      console.error('Product creation error:', error);
      
      // Provide specific error messages based on the error type
      if (error.message?.includes('auth') || error.message?.includes('token')) {
        toast.error('Authentication error. Please log in again.');
        router.push('/login');
      } else if (error.message?.includes('permission') || error.message?.includes('denied')) {
        toast.error('You do not have permission to create products.');
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(`Failed to create product: ${error.message || 'Unknown error'}`);
      }
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log('Form submitted with data:', data);
    console.log('Options:', options);
    
    // Check authentication before submitting
    if (!currentUser) {
      toast.error('Please log in to create products');
      router.push('/login');
      return;
    }
    
    createMutation.mutate(data);
  };

  const handleImageChange = (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
    if (fileOrEvent instanceof File) {
      file = fileOrEvent;
    } else {
      file = fileOrEvent.target.files?.[0] || null;
    }
    form.setValue("image", file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOption = () => {
    const newOption: ProductOption = {
      id: nanoid(),
      name: '',
      required: false,
      selection_type: 'single',
      max_selections: 1,
      sort_order: options.length,
      choices: []
    };
    setOptions([...options, newOption]);
  };

  const handleOptionChange = (index: number, updatedOption: ProductOption) => {
    const newOptions = [...options];
    newOptions[index] = updatedOption;
    setOptions(newOptions);
  };

  const handleDeleteOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  // Show loading while checking authentication
  if (userLoading) {
    return (
      <Layout title="Add New Product" showBackButton={true}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  // Redirect if not authenticated (handled by useEffect above)
  if (!currentUser) {
    return (
      <Layout title="Add New Product" showBackButton={true}>
        <div className="flex items-center justify-center min-h-screen">
          <p>Redirecting to login...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Add New Product" showBackButton={true}>
      <div className="container mx-auto py-6 px-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Create New Product</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={(e) => {
                console.log('Form submit event triggered');
                form.handleSubmit(
                  onSubmit,
                  (errors) => {
                    console.log('Form validation errors:', errors);
                  }
                )(e);
              }} className="space-y-6">
                {/* Form Fields */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      rules={{ required: "Product name is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Product name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Price */}
                    <FormField
                      control={form.control}
                      name="price"
                      rules={{
                        required: "Price is required",
                        validate: value => 
                          !isNaN(Number(value)) && Number(value) >= 0 || "Price must be a valid number"
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-0 inset-y-0 flex items-center pl-3 text-gray-500">
                                ฿
                              </span>
                              <Input
                                type="text"
                                placeholder="0.00"
                                className="pl-7"
                                {...field}
                                onChange={e => {
                                  const value = e.target.value.replace(/[^0-9.]/g, '');
                                  const decimalCount = (value.match(/\./g) || []).length;
                                  if (decimalCount <= 1) {
                                    field.onChange(value);
                                  }
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={value => field.onChange(value === 'none' ? null : value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {categories?.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Product description"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Image Upload */}
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

                {/* Options Section */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Options</h3>
                  {options.length > 0 ? (
                    <div className="space-y-6">
                      {options.map((option, index) => (
                        <ProductOptionsManager
                          key={option.id}
                          option={option}
                          onChange={updatedOption => handleOptionChange(index, updatedOption)}
                          onDelete={() => handleDeleteOption(index)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border rounded-lg border-dashed">
                      <p className="text-gray-500 mb-4">No options defined yet</p>
                    </div>
                  )}
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddOption}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add option
                    </Button>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/products')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      console.log('Debug button clicked');
                      console.log('Form values:', form.getValues());
                      console.log('Form errors:', form.formState.errors);
                    }}
                  >
                    Debug Form
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Product
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
