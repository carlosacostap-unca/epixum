import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// We now rely on the browser's timezone (or system timezone if server-side, 
// but these functions should primarily be used on the client for display/input).

export function formatDateForDisplay(dateString: string | null | undefined, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
    if (!dateString) return ''
    try {
        const date = new Date(dateString)
        return format(date, formatStr, { locale: es })
    } catch (e) {
        console.error('Error formatting date:', e)
        return ''
    }
}

export function toUTC(localDateString: string): string {
    if (!localDateString) return ''
    try {
        // Create a date object from the local string (e.g. "2023-10-10T10:00")
        // The browser interprets this as local time.
        const date = new Date(localDateString)
        return date.toISOString()
    } catch (e) {
        console.error('Error converting to UTC:', e)
        return ''
    }
}

export function toLocalISOString(dateString: string | null | undefined): string {
    if (!dateString) return ''
    try {
        const date = new Date(dateString)
        // Format to YYYY-MM-DDTHH:mm for input[type="datetime-local"]
        // date-fns format uses local timezone by default
        return format(date, "yyyy-MM-dd'T'HH:mm")
    } catch (e) {
        console.error('Error converting to local ISO:', e)
        return ''
    }
}

export function toLocalDateInputValue(dateString: string | null | undefined): string {
    if (!dateString) return ''
    try {
        const date = new Date(dateString)
        // Format to YYYY-MM-DD for input[type="date"]
        return format(date, "yyyy-MM-dd")
    } catch (e) {
        console.error('Error converting to local date input:', e)
        return ''
    }
}
