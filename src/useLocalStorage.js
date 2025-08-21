import { useSyncExternalStore } from "react";

function useLocalStorage(key, initialValue = "") {
    return useSyncExternalStore(
        (onStoreChange) => {
            const handleStorageChange = () => onStoreChange();
            addEventListener("storage", handleStorageChange);
            return () => removeEventListener("storage", handleStorageChange);
        },
        () => localStorage.getItem(key) || initialValue,
    );
}

export default useLocalStorage;