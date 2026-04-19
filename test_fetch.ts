const test = async () => {
    try {
        const res = await fetch("http://localhost:3000/api/derivData?symbol=CRASH1000");
        const json = await res.json();
        console.log(json);
    } catch(e) {
        console.error(e);
    }
}
test();
