// Mô phỏng tung đồng xu bằng bộ sinh số giả ngẫu nhiên của JavaScript.
const coinExperiment = {
  tosses: 0,
  heads: 0,
  toss() {
    this.tosses += 1;
    const isHeads = Math.random() < 0.5;
    if (isHeads) this.heads += 1;
    return isHeads ? "NGỬA" : "SẤP";
  },
  reset() {
    this.tosses = 0;
    this.heads = 0;
  },
  getHeadsFrequency() {
    return this.tosses === 0 ? 0 : this.heads / this.tosses;
  }
};
