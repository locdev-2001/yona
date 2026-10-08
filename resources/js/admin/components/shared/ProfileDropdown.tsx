// Third-party Imports
import { HouseIcon, LogOutIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarGeneratedFallback } from '@admin/components/ui/avatar'
import { Button } from '@admin/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@admin/components/ui/dropdown-menu'

// Util Imports
import { avatarSeed } from 'shared/avatar/avatarSeed'

// Config Imports
import useThemeConfig from '@admin/configs/themeConfig'

// Hai mục đều rời khỏi console (trang làm việc, đăng xuất) nên là link thường.
const ProfileDropdown = () => {
  const { currentUser, labels, templateName } = useThemeConfig()
  const fullName = currentUser?.name ?? templateName
  const currentUserSeed = avatarSeed('user', currentUser?.id)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className='relative rounded-full hover:bg-transparent'
            aria-label={labels.user_menu ?? 'user_menu'}
          />
        }
      >
        <Avatar>
          <AvatarGeneratedFallback seed={currentUserSeed} name={fullName} />
        </Avatar>
        <span className='ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-60'>
        {currentUser && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className='flex items-center gap-4 px-2 py-2.5 font-normal'>
                <div className='relative'>
                  <Avatar className='size-10'>
                    <AvatarGeneratedFallback seed={currentUserSeed} name={fullName} />
                  </Avatar>
                  <span className='ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2' />
                </div>
                <div className='flex min-w-0 flex-1 flex-col items-start'>
                  <span className='text-foreground max-w-full truncate text-base font-semibold'>{currentUser.name}</span>
                  <span className='text-muted-foreground max-w-full truncate text-sm'>{currentUser.email}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuGroup>
          <DropdownMenuItem render={<a href='/' />}>
            <HouseIcon />
            <span>{labels.back_to_app ?? 'back_to_app'}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem variant='destructive' render={<a href='/admin/logout' />}>
            <LogOutIcon />
            <span>{labels.logout ?? 'logout'}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileDropdown
