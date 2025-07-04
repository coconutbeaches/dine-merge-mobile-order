
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, ArrowUp, ArrowDown, Edit, Trash } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

const CategoriesManager = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });

  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });

  // Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .insert([
          {
            name: category.name,
            description: category.description || null,
            sort_order: categories ? categories.length : 0,
          },
        ])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category added successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error adding category: ${error.message}`);
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (category: { id: string; name: string; description: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update({
          name: category.name,
          description: category.description || null,
        })
        .eq('id', category.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error updating category: ${error.message}`);
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error deleting category: ${error.message}`);
    },
  });

  // Update sort order mutation
  const updateSortOrderMutation = useMutation({
    mutationFn: async ({
      categoryId,
      newSortOrder,
    }: {
      categoryId: string;
      newSortOrder: number;
    }) => {
      const { error } = await supabase
        .from('categories')
        .update({ sort_order: newSortOrder })
        .eq('id', categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      toast.error(`Error updating sort order: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryForm.name) {
      toast.error('Category name is required');
      return;
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        name: categoryForm.name,
        description: categoryForm.description,
      });
    } else {
      addCategoryMutation.mutate({
        name: categoryForm.name,
        description: categoryForm.description,
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0 || !categories) return;
    
    const categoryToMove = categories[index];
    const categoryAbove = categories[index - 1];
    
    updateSortOrderMutation.mutate({
      categoryId: categoryToMove.id,
      newSortOrder: categoryAbove.sort_order,
    });
    
    updateSortOrderMutation.mutate({
      categoryId: categoryAbove.id,
      newSortOrder: categoryToMove.sort_order,
    });
  };

  const handleMoveDown = (index: number) => {
    if (!categories || index === categories.length - 1) return;
    
    const categoryToMove = categories[index];
    const categoryBelow = categories[index + 1];
    
    updateSortOrderMutation.mutate({
      categoryId: categoryToMove.id,
      newSortOrder: categoryBelow.sort_order,
    });
    
    updateSortOrderMutation.mutate({
      categoryId: categoryBelow.id,
      newSortOrder: categoryToMove.sort_order,
    });
  };

  const resetForm = () => {
    setCategoryForm({ name: '', description: '' });
    setEditingCategory(null);
    setIsDialogOpen(false);
  };

  return (
    <Layout title="Categories Manager" showBackButton>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Manage Categories</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', description: '' });
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={categoryForm.name}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, name: e.target.value })
                        }
                        placeholder="Category name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Textarea
                        id="description"
                        value={categoryForm.description}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Category description"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <DialogClose asChild>
                      <Button variant="outline" type="button" onClick={resetForm}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit">
                      {editingCategory ? 'Update' : 'Add'} Category
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : categories && categories.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category, index) => (
                    <TableRow key={category.id}>
                      <TableCell className="w-[100px]">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === (categories?.length || 1) - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <span className="font-mono">{category.sort_order}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{category.name}</span>
                      </TableCell>
                      <TableCell>{category.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/products-by-category/${category.id}`)}
                          >
                            Products
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4">
                No categories found. Click the "Add Category" button to create one.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8">
          <Button onClick={() => navigate('/admin')} variant="outline">
            Back to Admin Dashboard
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default CategoriesManager;
