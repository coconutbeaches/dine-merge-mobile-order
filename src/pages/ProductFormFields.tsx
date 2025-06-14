
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// The form prop is react-hook-form's useForm return
const ProductFormFields = ({ form }) => {
  // Category select options
  const categories = form.getValues("_categories") || [];
  return (
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
              value={field.value || undefined}
              onValueChange={value => field.onChange(value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
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
  );
};
export default ProductFormFields;
