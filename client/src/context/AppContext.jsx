import { createContext, useState , useEffect} from "react";

export const AppContext = createContext();

export const AppContextProvider = ({children}) => {

    const [searchFilter, setSearchFilter] = useState({
        title:'',
        location:''
    })

    const [isSearched, setIsSearched] = useState(false);

    const [jobs, setJobs] = useState([])

    // Function to fetch jobs
    const fetchJobs = async () => {
        setJobs(jobsData)
    }

    useEffect(() =>{
        fetchJobs()
    }, [])

    const value = {
            setSearchFilter, searchFilter,
            isSearched, setIsSearched,
            jobs, setJobs
    };

    return (<AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>);
};