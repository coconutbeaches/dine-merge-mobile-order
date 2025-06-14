import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Product, ProductOption, ProductOptionChoice } from '@/types/supabaseTypes';
import ProductOptionsManager from '@/components/ProductOptionsManager';
import { Trash2, Plus } from 'lucide-react';
import { nanoid } from 'nanoid';

interface Category {
  id: string;
  name: string;
}

interface FormValues {
  name: string;
  price: number | string;
  description: string;
  image: File | null;
  category_id: string | null;
}

const ProductForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id) && id !== 'new';
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      price: '',
      description: '',
      image: null,
      category_id: null
    }
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('sort_order', { ascending: true });
        
      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch product if in edit mode
  const { data: product, isLoading, error: productError } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!isEditMode) return null;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // change from .single() to .maybeSingle()
      if (error) throw error;
      return data as Product | null;
    },
    enabled: isEditMode
  });

  // Display loading or error states
  if (isLoading && isEditMode) {
    return (
      <Layout title="Loading Product...">
        <div className="container mx-auto py-6">Loading...</div>
      </Layout>
    );
  }

  if (productError) {
    return (
      <Layout title="Product Not Found">
        <div className="container mx-auto py-6 text-red-500">
          Error loading product. {String(productError)}
        </div>
      </Layout>
    );
  }

  // If product is null (not found), show message
  if (isEditMode && !product) {
    return (
      <Layout title="Product Not Found">
        <div className="container mx-auto py-6 text-red-500">
          Product not found (ID: {id}).
        </div>
      </Layout>
    );
  }

  // Fetch product options if in edit mode
  const { data: productOptions } = useQuery({
    queryKey: ['productOptions', id],
    queryFn: async () => {
      if (!isEditMode) return [];
      
      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', id)
        .order('sort_order', { ascending: true });
        
      if (optionsError) throw optionsError;
      
      const options: ProductOption[] = [];
      
      // For each option, fetch its choices
      for (const option of optionsData) {
        const { data: choicesData, error: choicesError } = await supabase
          .from('product_option_choices')
          .select('*')
          .eq('option_id', option.id)
          .order('sort_order', { ascending: true });
          
        if (choicesError) throw choicesError;
        
        options.push({
          ...option,
          selection_type: option.selection_type as "single" | "multiple", // Ensure correct typing
          choices: choicesData as ProductOptionChoice[]
        });
      }
      
      return options;
    },
    enabled: isEditMode
  });

  // Set form values when product data is loaded
  useEffect(() => {
    // Populate form only when editing and product changes
    if (isEditMode && product) {
      form.reset({
        name: product.name ?? '',
        price: product.price !== undefined && product.price !== null ? String(product.price) : '',
        description: product.description ?? '',
        category_id: product.category_id ?? null,
        image: null, // never prefill image upload, that's user-provided only
      });

      // Show preview if image url exists
      if (product.image_url) {
        setImagePreview(product.image_url);
      } else {
        setImagePreview(null);
      }
    }
    // Only runs when product changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, isEditMode]); // add isEditMode in deps for clarity

  // Set options when product options are loaded
  useEffect(() => {
    if (productOptions) {
      setOptions(productOptions);
    }
  }, [productOptions]);

  // Handle image change (from click or drag-n-drop)
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

  // Upload image to storage
  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${nanoid()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('products')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      let imageUrl = null;
      
      // Upload image if provided
      if (data.image) {
        imageUrl = await uploadImage(data.image);
      }
      
      // Insert product
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert([{
          name: data.name,
          description: data.description,
          price: parseFloat(data.price.toString()),
          image_url: imageUrl,
          category_id: data.category_id
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      // Insert options
      if (options.length > 0) {
        for (const option of options) {
          // Create option with properly typed selection_type
          const { data: newOption, error: optionError } = await supabase
            .from('product_options')
            .insert([{
              product_id: newProduct.id,
              name: option.name,
              required: option.required,
              enable_quantity: option.enable_quantity,
              selection_type: option.selection_type,
              sort_order: option.sort_order
            }])
            .select()
            .single();
          
          if (optionError) throw optionError;
          
          // Create choices
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
      
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['menu-products'] });
      toast.success('Product created successfully');
      navigate('/products-dashboard');
    },
    onError: (error) => {
      toast.error('Failed to create product');
      console.error(error);
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!id) return;
      
      let imageUrl = null;
      
      // Upload image if provided
      if (data.image) {
        imageUrl = await uploadImage(data.image);
      }
      
      // Build update object
      const updateData: any = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price.toString()),
        category_id: data.category_id
      };
      
      // Only update image if a new one was provided
      if (imageUrl) {
        updateData.image_url = imageUrl;
      }
      
      // Update product
      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Handle options update
      // First delete existing options and choices to avoid conflicts
      // This is a simplification - in a real app you might want to do a more sophisticated diff and update
      
      const { error: deleteOptionsError } = await supabase
        .from('product_options')
        .delete()
        .eq('product_id', id);
        
      if (deleteOptionsError) throw deleteOptionsError;
      
      // Insert updated options
      if (options.length > 0) {
        for (const option of options) {
          // Create option with properly typed selection_type
          const { data: newOption, error: optionError } = await supabase
            .from('product_options')
            .insert([{
              product_id: id,
              name: option.name,
              required: option.required,
              enable_quantity: option.enable_quantity,
              selection_type: option.selection_type,
              sort_order: option.sort_order
            }])
            .select()
            .single();
          
          if (optionError) throw optionError;
          
          // Create choices
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
      queryClient.invalidateQueries({ queryKey: ['menu-products'] });
      toast.success('Product updated successfully');
      navigate('/products-dashboard');
    },
    onError: (error) => {
      toast.error('Failed to update product');
      console.error(error);
    }
  });

  const onSubmit = async (data: FormValues) => {
    if (isEditMode) {
      updateProductMutation.mutate(data);
    } else {
      createProductMutation.mutate(data);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(price);
  };

  const handleAddOption = () => {
    const newOption: ProductOption = {
      id: `temp-${nanoid()}`,
      product_id: id || '',
      name: `Option ${options.length + 1}`,
      required: false,
      enable_quantity: false,
      selection_type: "single",  // Explicitly use string literal
      choices: [{
        id: `temp-${nanoid()}`,
        option_id: '',
        name: 'Choice 1',
        price_adjustment: 0,
        sort_order: 0
      }],
      sort_order: options.length
    };
    
    setOptions([...options, newOption]);
  };

  const handleOptionChange = (index: number, updatedOption: ProductOption) => {
    const newOptions = [...options];
    newOptions[index] = updatedOption;
    setOptions(newOptions);
  };

  const handleDeleteOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions.map((option, i) => ({ ...option, sort_order: i })));
  };

  return (
    <Layout title={isEditMode ? 'Edit Product' : 'Add Product'} showBackButton>
      <div className="container mx-auto py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: 'Product name is required' }}
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

                  {/* Product Price */}
                  <FormField
                    control={form.control}
                    name="price"
                    rules={{ 
                      required: 'Price is required',
                      validate: value => 
                        !isNaN(Number(value)) && Number(value) >= 0 || 'Price must be a valid number'
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
                                // Allow only numbers and a single decimal point
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
                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={field.value || undefined}
                          onValueChange={(value) => field.onChange(value || null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {categories?.map((category) => (
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
                </div>

                {/* Description */}
                <div className="mt-6">
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
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover rounded-md border" 
                        />
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
              </CardContent>
            </Card>

            {/* Product Options */}
            <Card>
              <CardContent className="pt-6">
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
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products-dashboard')}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
              >
                {createProductMutation.isPending || updateProductMutation.isPending ? 
                  'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default ProductForm;
