import React from 'react'
import { assets } from '../assets/assets'
const Hero = () => {
return (
    <div>
        <div>
            <h2>Over 10,000+ to apply</h2>
            <p>Your next Big Career Move Starts Right Here - Explore the Best Job opportunities and Take the First Step Toward Your Future!</p>
            <div>
                <div>
                    <img src={assets.search_icon} alt=""/>
                    <input type="text"
                    placeholder='Search for jobs'
                    className='max-sm:text-xs p-2 rounded outline-none w-full'/>
                </div>
                <div>
                    <img src={assets.location_icon} alt=""/>
                    <input type="text"
                    placeholder='Location'
                    className='max-sm:text-xs p-2 rounded outline-none w-full'/>
                </div>
            </div>
        </div>
    </div>
)
}

export default Hero
