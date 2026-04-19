const test = async () => {
    try {
        const res = await fetch("http://localhost:3000/api/derivData?symbol=CRASH500");
        const json = await res.json();
        console.log("CRASH500:", json);
    } catch(e) {
        console.error(e);
    }
}
test();
