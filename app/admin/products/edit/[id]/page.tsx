'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
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
import type { ProductOption, Product } from '@/types/supabaseTypes';

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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { currentUser, isLoading: userLoading } = useUserContext();
  
  // UI state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [formInitialized, setFormInitialized] = useState(false);
  
  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      price: '',
      description: '',
      category_id: null,
      image: null,
    },
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!userLoading && !currentUser) {
      toast.error('Please log in to edit products');
      router.push('/login');
    }
  }, [currentUser, userLoading, router]);

  // Fetch product data
  const { data: product, isLoading: productLoading, error: productError } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name)')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    enabled: !!currentUser && !!productId,
  });

  // Monitor product and form state
  useEffect(() => {
    // Form initialization happens in separate useEffect below
  }, [product, productLoading, productError, currentUser, formInitialized]);

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!currentUser,
  });
  // Fetch product options
  const { data: productOptions } = useQuery({
    queryKey: ['productOptions', productId],
    queryFn: async () => {
      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });
      if (optionsError) throw optionsError;

      const options: ProductOption[] = [];
      for (const option of optionsData) {
        const { data: choicesData, error: choicesError } = await supabase
          .from('product_option_choices')
          .select('*')
          .eq('option_id', option.id)
          .order('sort_order', { ascending: true });
        if (choicesError) throw choicesError;

        options.push({
          ...option,
          selection_type: option.selection_type as 'single' | 'multiple',
          choices: choicesData,
        });
      }
      return options;
    },
    enabled: !!currentUser && !!productId,
  });

  // Initialize form with product data
  useEffect(() => {
    if (product && categories && !formInitialized) {
      const categoryId = product.category_id || null;
      
      form.reset({
        name: product.name || '',
        price: product.price ? String(product.price) : '',
        description: product.description || '',
        category_id: categoryId,
        image: null,
      });
      
      // Force update the category field specifically to ensure it's set
      setTimeout(() => {
        form.setValue('category_id', categoryId);
      }, 0);
      
      if (product.image_url) {
        setImagePreview(product.image_url);
      }
      
      setFormInitialized(true);
    }
  }, [product, categories, form, formInitialized]);

  // Initialize options
  useEffect(() => {
    if (productOptions) {
      setOptions(productOptions);
    }
  }, [productOptions]);

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

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      let imageUrl = product?.image_url || null;
      if (data.image) {
        imageUrl = await uploadImage(data.image);
      }

      const updateData: any = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        category_id: data.category_id || null
      };
      if (imageUrl !== product?.image_url) {
        updateData.image_url = imageUrl;
      }
      
      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId);
      if (error) throw error;

      // Remove old options and add new
      const { error: deleteOptionsError } = await supabase
        .from('product_options')
        .delete()
        .eq('product_id', productId);
      if (deleteOptionsError) throw deleteOptionsError;

      // Insert options
      if (options.length > 0) {
        for (const option of options) {
          const { data: newOption, error: optionError } = await supabase
            .from('product_options')
            .insert([{
              product_id: productId,
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
              .from('product_option_choices')
              .insert(choicesData);
            if (choicesError) throw choicesError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['productOptions', productId] });
      queryClient.invalidateQueries({ queryKey: ['menu-products'] });
      toast.success('Product updated successfully');
      router.push('/admin/products');
    },
    onError: (error) => {
      console.error('Product update error:', error);
      if (error.message?.includes('auth') || error.message?.includes('token')) {
        toast.error('Authentication error. Please log in again.');
        router.push('/login');
      } else {
        toast.error(`Failed to update product: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['menu-products'] });
      toast.success('Product deleted successfully');
      router.push('/admin/products');
    },
    onError: (error) => {
      toast.error('Failed to delete product');
      console.error(error);
    }
  });

  const onSubmit = (data: FormValues) => {
    if (!currentUser) {
      toast.error('Please log in to update products');
      router.push('/login');
      return;
    }
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleImageChange = (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
    if (fileOrEvent instanceof File) {
      file = fileOrEvent;
    } else {
      file = fileOrEvent.target.files?.[0] || null;
    }
    form.setValue('image', file);
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
      choices: [{
        id: nanoid(),
        option_id: '',
        name: '',
        price_adjustment: 0,
        sort_order: 0
      }]
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

  // Loading states
  if (userLoading || productLoading) {
    return (
      <Layout title="Edit Product" showBackButton={true}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  // Error states
  if (productError) {
    return (
      <Layout title="Edit Product" showBackButton={true}>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Product not found or failed to load.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Redirect if not authenticated
  if (!currentUser) {
    return (
      <Layout title="Edit Product" showBackButton={true}>
        <div className="flex items-center justify-center min-h-screen">
          <p>Redirecting to login...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Edit Product" showBackButton={true}>
      <div className="container mx-auto py-6 px-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Edit Product</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            className="min-h-[40px] resize-none"
                            rows={1}
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
                  {options.length > 0 && (
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
                <div className="flex justify-end items-center space-x-4">
                  {/* Delete button - just icon */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending || updateMutation.isPending}
                    className="h-10 w-10"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {/* Cancel button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/products')}
                  >
                    Cancel
                  </Button>
                  
                  {/* Save button - black */}
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    {updateMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save
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
