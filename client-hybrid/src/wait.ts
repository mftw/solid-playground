export default function wait(time = 1000) {
    return new Promise(res => setTimeout(res, time))
}