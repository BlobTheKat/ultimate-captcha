// Example program
#include <iostream>
#include <string>
#include <atomic>
#include <thread>
#include <chrono>
#include <iomanip>
using namespace std;
typedef uint32_t uint;

#define SIZE_MB 64

uint heap[(1<<18) * SIZE_MB];

uint fetch(uint i, uint r){ return heap[i&0x3ffff|r%SIZE_MB<<18]; }

uint kernel(uint y){
	uint x = 0;
	for(uint r=0;r<262144;r++){
		uint id = x;
		uint a = fetch(y, r), m = a>>3;
		switch(a&7){
			case 0: id ^= fetch(id+m%123, r); break;
			case 1: id ^= fetch(id+m/456, r); break;
			case 2: id ^= fetch(id+m%997, r); break;
			case 3: id ^= fetch(id+m/451, r); break;
			case 4: id ^= fetch(id+m%409, r); break;
			case 5: id ^= fetch(id+m/111, r); break;
			case 6: id ^= fetch(id+m%789, r); break;
			case 7: id ^= fetch(id+m/333, r); break;
		}
		y = x; x = id;
	}
	return x;
}
atomic_uint at; int top;
atomic<uint64_t> totalTime;
atomic_uint total;
void work(){
	uint id, hash = 0;
	auto t0 = chrono::high_resolution_clock::now();
	while((id = at++) < top) hash += kernel(id);
	totalTime += (chrono::high_resolution_clock::now() - t0).count();
	total += hash;
}

int main(){
	uint xsh = 9999;
	if(!xsh) xsh = 0xFFFFFFFF;
	for(int i=0;i<(1<<18)*SIZE_MB;i++){
		heap[i] = xsh;
		xsh ^= xsh << 13;
		xsh ^= xsh >> 17;
		xsh ^= xsh << 5;
	}
	top = 512; at = 0;
	long long thc = thread::hardware_concurrency();
	thread* ths = new thread[thc];
	auto t0 = chrono::high_resolution_clock::now();
	for(int i=0;i<thc;i++) ths[i] = thread(work);
	for(int i=0;i<thc;i++) ths[i].join();
	double real = (chrono::high_resolution_clock::now() - t0).count();
	cout << "CPU: " << double(totalTime)/1'000'000 << "ms / threads: " << thc << "\nReal: " << real/1'000'000 << "ms" << endl;
	cout << "hash: " << setfill('0') << setw(8) << hex << total << endl;
}