import type { UserDTO } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface UserMenuProps {
  user: UserDTO;
  onLogout?: () => void;
}

/**
 * User menu component as dropdown for authenticated user.
 * Provides user avatar, email display, and logout functionality.
 */
export function UserMenu({ user, onLogout }: UserMenuProps) {
  // Get user initials for avatar fallback
  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center space-x-2 rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Menu użytkownika"
          data-test-id="user-menu-trigger"
        >
          <Avatar className="h-8 w-8" data-test-id="user-avatar">
            <AvatarImage src={user.avatar_url} alt={`Avatar użytkownika ${user.email}`} />
            <AvatarFallback>{getUserInitials(user.email)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.email}</p>
            <p className="text-xs leading-none text-muted-foreground">Zalogowany</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-600 focus:text-red-600">
          Wyloguj
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
