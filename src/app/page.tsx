import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to the menu page
  redirect('/menu');
  
  // This part won't be rendered due to the redirect
  return null;
}
