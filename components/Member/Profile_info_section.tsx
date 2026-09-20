import React from 'react'
import { IoSettingsOutline } from "react-icons/io5";
import { RiShareBoxLine } from "react-icons/ri";
import { AiOutlineFullscreen } from "react-icons/ai";


interface ProfileInfoSectionProps {
  className?: string;
}

const Profile_info_section = ({ className = "" }: ProfileInfoSectionProps) => {
  return (
    <div className={`h-7 flex items-center gap-4 text-zinc-300 ${className}`} >
        <div className='cursor-pointer hover:text-white transition-colors' title="Fullscreen">
            <AiOutlineFullscreen />
        </div>
        <div className='cursor-pointer hover:text-white transition-colors' title="Share">
            <RiShareBoxLine />
        </div>
        <div className='cursor-pointer hover:text-white transition-colors' title="Settings">
         <IoSettingsOutline />
      </div>
      <div className='w-6 h-6 rounded-full bg-zinc-300 hover:bg-white cursor-pointer transition-colors' title="Profile">
      </div>
    </div>
  )
}

export default Profile_info_section
